import { NextRequest, NextResponse } from 'next/server';
import { encodeDemoCode, getOAuthStatus } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const provider = searchParams.get('provider') || 'google';
  const redirectUri = searchParams.get('redirect_uri') || '/api/auth/callback';
  const state = searchParams.get('state') || '';
  const status = getOAuthStatus();

  const isSimulatedGoogle = provider === 'google' && !status.google.isConfigured;
  const isSimulatedGithub = provider === 'github' && !status.github.isConfigured;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Authorize Automated Jobs (${provider.toUpperCase()} OAuth)</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #090d16;
      color: #f1f5f9;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .card {
      background: #0f172a;
      border: 1px solid #1e293b;
      border-radius: 20px;
      padding: 32px;
      max-width: 440px;
      width: 100%;
      box-shadow: 0 20px 40px -15px rgba(0,0,0,0.5);
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 16px;
    }
    .badge-google { background: rgba(66, 133, 244, 0.15); color: #60a5fa; border: 1px solid rgba(66, 133, 244, 0.3); }
    .badge-github { background: rgba(148, 163, 184, 0.15); color: #cbd5e1; border: 1px solid rgba(148, 163, 184, 0.3); }
    .badge-demo { background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); }
    
    h1 { font-size: 20px; font-weight: 700; color: #fff; margin-bottom: 8px; }
    p.desc { font-size: 13px; color: #94a3b8; line-height: 1.5; margin-bottom: 20px; }
    
    .notice-box {
      background: rgba(99, 102, 241, 0.1);
      border: 1px solid rgba(99, 102, 241, 0.25);
      border-radius: 12px;
      padding: 12px;
      margin-bottom: 20px;
      font-size: 12px;
      color: #c7d2fe;
      line-height: 1.4;
    }
    
    .account-select {
      margin-bottom: 20px;
    }
    .account-select label {
      display: block;
      font-size: 12px;
      font-weight: 600;
      color: #94a3b8;
      margin-bottom: 8px;
    }
    .account-option {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 12px;
      padding: 12px;
      display: flex;
      align-items: center;
      gap: 12px;
      cursor: pointer;
      margin-bottom: 8px;
      transition: all 0.2s;
    }
    .account-option:hover {
      border-color: #6366f1;
      background: #243049;
    }
    .account-option.active {
      border-color: #6366f1;
      background: rgba(99, 102, 241, 0.15);
    }
    .avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: #4f46e5;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 14px;
      color: #fff;
    }
    .account-info { flex: 1; min-width: 0; }
    .account-info .name { font-size: 13px; font-weight: 600; color: #fff; }
    .account-info .email { font-size: 11px; color: #94a3b8; }
    
    .permissions {
      background: #0b1120;
      border: 1px solid #1e293b;
      border-radius: 12px;
      padding: 12px;
      margin-bottom: 24px;
      font-size: 12px;
      color: #94a3b8;
    }
    .permissions ul { padding-left: 18px; margin-top: 6px; }
    .permissions li { margin-bottom: 4px; color: #cbd5e1; }
    
    .btn {
      width: 100%;
      padding: 12px;
      background: #4f46e5;
      color: #fff;
      border: none;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: background 0.2s;
    }
    .btn:hover { background: #4338ca; }
    .btn-cancel {
      background: transparent;
      color: #94a3b8;
      margin-top: 10px;
      font-size: 12px;
      border: 1px solid #334155;
    }
    .btn-cancel:hover { background: #1e293b; color: #fff; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge ${provider === 'google' ? 'badge-google' : provider === 'github' ? 'badge-github' : 'badge-demo'}">
      ${provider === 'google' ? 'Google OAuth 2.0' : provider === 'github' ? 'GitHub OAuth' : 'Fast Demo OAuth'}
    </div>
    
    <h1>Sign in to Automated Jobs</h1>
    <p class="desc">Choose your profile to authenticate and grant access to your candidate workspace.</p>

    ${(isSimulatedGoogle || isSimulatedGithub) ? `
      <div class="notice-box">
        💡 <strong>Note:</strong> ${provider.toUpperCase()}_CLIENT_ID is not configured in Settings yet. Running in verified fast-demo OAuth mode so you can test the complete popup and session flow immediately!
      </div>
    ` : ''}

    <div class="account-select">
      <label>SELECT ACCOUNT:</label>
      
      <div class="account-option active" onclick="selectAccount('samaddersourasish2006@gmail.com', 'Sourasish Samadder', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150', this)">
        <div class="avatar" style="background:#4f46e5">S</div>
        <div class="account-info">
          <div class="name">Sourasish Samadder (You)</div>
          <div class="email">samaddersourasish2006@gmail.com</div>
        </div>
      </div>

      <div class="account-option" onclick="selectAccount('raihanmolla9903@gmail.com', 'Raihan Molla', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', this)">
        <div class="avatar" style="background:#059669">R</div>
        <div class="account-info">
          <div class="name">Raihan Molla</div>
          <div class="email">raihanmolla9903@gmail.com (Senior SWE)</div>
        </div>
      </div>
    </div>

    <div class="permissions">
      <strong>Permissions Requested:</strong>
      <ul>
        <li>Verify your basic identity (name and avatar)</li>
        <li>Access your primary email address</li>
        <li>Isolate your candidate applications & tailored resumes</li>
      </ul>
    </div>

    <button id="authBtn" class="btn" onclick="submitAuth()">
      <span>Authorize & Continue</span> &rarr;
    </button>
    <button class="btn btn-cancel" onclick="window.close()">Cancel</button>
  </div>

  <script>
    let selected = {
      email: 'samaddersourasish2006@gmail.com',
      name: 'Sourasish Samadder',
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'
    };

    function selectAccount(email, name, avatarUrl, el) {
      selected = { email, name, avatarUrl };
      document.querySelectorAll('.account-option').forEach(opt => opt.classList.remove('active'));
      el.classList.add('active');
    }

    function submitAuth() {
      const btn = document.getElementById('authBtn');
      btn.innerHTML = 'Connecting...';
      btn.disabled = true;

      // Encode payload into code
      const payload = {
        email: selected.email,
        name: selected.name,
        avatarUrl: selected.avatarUrl,
        provider: '${provider}'
      };
      
      const code = btoa(JSON.stringify(payload)).replace(/\\+/g, '-').replace(/\\//g, '_').replace(/=+$/, '');
      const redirectUri = '${redirectUri}';
      const state = '${state}';
      
      const callbackUrl = redirectUri + '?code=' + encodeURIComponent(code) + '&state=' + encodeURIComponent(state) + '&provider=${provider}';
      window.location.href = callbackUrl;
    }
  </script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}
