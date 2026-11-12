import type {Express,RequestHandler} from 'express';
export function registerAuthRoutes(app:Express,deps:{registerRateLimiter:RequestHandler;registerValidation:RequestHandler;persistentLimit:RequestHandler;loginProtectionMiddleware:RequestHandler;loginValidation:RequestHandler;findUserByEmail:any;createUser:any;issueLoginSession:any;recordFailedLogin:any;recordSuccessfulLogin:any;verifyPassword:any;upgradeUserPassword:any;findUserById:any}){const {registerRateLimiter,registerValidation,persistentLimit,loginProtectionMiddleware,loginValidation,findUserByEmail,createUser,issueLoginSession,recordFailedLogin,recordSuccessfulLogin,verifyPassword,upgradeUserPassword,findUserById}=deps;
app.post('/api/auth/register', registerRateLimiter, registerValidation, async (req, res) => {
  try {
    const { email, password, full_name, role } = req.body;

    const existing = await findUserByEmail(email);
    if (existing) {
      res.status(409).json({ success: false, error: 'An account with this email already exists' });
      return;
    }

    const user = await createUser({
      email,
      password,
      full_name,
      role,
    });

    const session = await issueLoginSession(req,res,user);
    res.status(201).json({
      success: true,
      ...session,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        is_platform_admin: Boolean(user.is_platform_admin),
      },
    });
  } catch (err: any) {
    res.status(503).json({ success: false, error: 'Authentication storage unavailable. Sign in or reload before retrying.' });
  }
});

// User login (protected with rate limiting, brute-force account lockout & Zod schema validation)
app.post('/api/auth/login', persistentLimit,loginProtectionMiddleware, loginValidation, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ success: false, error: 'Email and password are required' });
      return;
    }

    const user = await findUserByEmail(email);
    if (!user) {
      const lockStatus = recordFailedLogin(req, email);
      if (lockStatus.isLocked) {
        res.setHeader('Retry-After', (lockStatus.lockedForSeconds || 900).toString());
        res.status(429).json({
          success: false,
          error: 'Account temporarily locked due to 5 consecutive failed login attempts. For security, please try again in 15 minutes.',
          locked: true,
          retryAfter: lockStatus.lockedForSeconds,
        });
        return;
      }
      res.status(401).json({
        success: false,
        error: 'Invalid email or password',
        remainingAttempts: lockStatus.remainingAttempts,
      });
      return;
    }

    const isValid = verifyPassword(password, user.password_hash, user.salt);
    if (!isValid) {
      const lockStatus = recordFailedLogin(req, email);
      if (lockStatus.isLocked) {
        res.setHeader('Retry-After', (lockStatus.lockedForSeconds || 900).toString());
        res.status(429).json({
          success: false,
          error: 'Account temporarily locked due to 5 consecutive failed login attempts. For security, please try again in 15 minutes.',
          locked: true,
          retryAfter: lockStatus.lockedForSeconds,
        });
        return;
      }
      res.status(401).json({
        success: false,
        error: 'Invalid email or password',
        remainingAttempts: lockStatus.remainingAttempts,
      });
      return;
    }

    // Authentication succeeded: clear failed attempts for this email
    recordSuccessfulLogin(req, email);

    // Transparently upgrade legacy low-iteration hashes to OWASP 210,000 iterations
    await upgradeUserPassword(user.id,password);
    const currentUser=await findUserById(user.id);
    if(!currentUser||!verifyPassword(password,currentUser.password_hash,currentUser.salt)){res.status(401).json({success:false,error:'Credentials changed. Sign in again.'});return;}
    const session = await issueLoginSession(req,res,currentUser);
    res.json({
      success: true,
      ...session,
      user: {
        id: currentUser.id,
        email: currentUser.email,
        full_name: currentUser.full_name,
        role: currentUser.role,
        is_platform_admin: Boolean(currentUser.is_platform_admin),
      },
    });
  } catch (err: any) {
    res.status(503).json({ success: false, error: 'Authentication storage unavailable. Sign in or reload before retrying.' });
  }
});

}
