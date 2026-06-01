__SORSA\.MARKET__

Phase 3 — Auth, Wallet & Reward Engine

Step\-by\-step guide  |  Built with Google Antigravity

Supabase  |  X OAuth  |  RainbowKit on Base  |  Sorsa API

__Phase__

3 — Auth \+ Wallet \+ Reward Engine

__Prerequisite__

Phase 2 frontend fully complete

__AI Tool__

Google Antigravity \(handles schema \+ code gen\)

__Backend__

Supabase \(Auth \+ Database \+ Storage\)

__Auth__

X OAuth for creators  |  Email or X for brands

__Wallet__

RainbowKit \+ wagmi on Base chain

__Score API__

Sorsa \(TweetScout\) — Sorsa Score \+ post impressions

__Reward Calc__

Sorsa Score ÷ 10  ×  Follower Mult  ×  Impression Mult

__Deploy__

Vercel

# __01\. WHAT YOU ARE BUILDING IN PHASE 3__

Phase 2 gave you a complete frontend with mock data\. Phase 3 makes it real\. By the end of this phase your app will:

- Let creators log in with their real X account via OAuth — no password needed
- Let brands register and log in with email/password or their X account
- Connect creator wallets on Base chain \(MetaMask, Coinbase Wallet, etc\.\)
- Connect creator wallets on Base chain (MetaMask, Coinbase Wallet, etc.)
- Store all real user data in Supabase instead of mock data
- Fetch a creator's real Sorsa Score and follower count from the Sorsa API
- Track total post impressions via Sorsa API across all campaign posts
- Calculate each creator's reward using the reward formula automatically
0

0

$15

1\.00

0\.50

__$7\.50__

150

2\.5k

1k

$15

1\.35

0\.70

__$14\.18__

150

2\.5k

3\.5k

$15

1\.35

1\.20

__$24\.30__

150

3\.5k

3\.5k

$15

1\.49

1\.20

__$26\.82__

150

5k

5k

$15

1\.70

1\.50

__$38\.25__

500

0

0

$50

1\.00

0\.50

__$25\.00__

500

2\.5k

1k

$50

1\.35

0\.70

__$47\.25__

500

5k

5k

$50

1\.70

1\.50

__$127\.50__

1000

5k

5k

$100

1\.70

1\.50

__$255\.00__

2000

5k

5k

$200

1\.70

1\.50

__$510\.00__

# __03\. ACCOUNTS TO SET UP FIRST__

Do these before running any Antigravity prompts\. Takes about 20 minutes total\.

## __3\.1 — Supabase__

__STEP 1  Create your Supabase account__

1. Go to supabase\.com → click \[Start your project\]
2. Sign up with GitHub \(recommended\) or email
3. Click \[New Project\] → name it: sorsa\-market
4. Set a strong database password — save it somewhere safe
5. Choose region: US East or EU West
6. Click \[Create new project\] — takes about 2 minutes

__STEP 2  Get your Supabase API keys__

1. In your project go to \[Project Settings\] → \[API\]
2. Copy and save both:
	- Project URL \(looks like: https://xyzxyz\.supabase\.co\)
	- anon/public key \(long string starting with eyJ\.\.\.\)

__⚠  NOTE: Never share the service\_role key\. The anon key is safe for your frontend\.__

## __3\.2 — Sorsa API \(TweetScout\)__

__STEP 3  Create your Sorsa API account__

1. Go to tweetscout\.io → Sign Up
2. Find the API section in your dashboard
3. Generate an API key and copy it — save it
4. Make sure your plan covers: Sorsa Score lookup \+ post impression tracking

__✓  TIP: Start on a free or starter plan during development\. Upgrade before launch\.__

## __3\.3 — X Developer App \(for OAuth login only\)__

__STEP 4  Create your X Developer App__

1. Go to developer\.twitter\.com → sign in with your X account
2. Click \[Sign up for Free Account\] if prompted
3. Look for \[\+ New Project\] or \[\+ Add App\] on your dashboard
4. Name the project: Sorsa Market
5. Inside the project create an App — name it: Sorsa Market App
6. Go to App Settings → \[User authentication settings\] → \[Set up\]
7. Enable OAuth 2\.0
8. Set App permissions to: \[Read\]
9. Set Type of App to: \[Web App\]
10. Callback URI — paste this exactly:

https://\[YOUR\-SUPABASE\-PROJECT\-ID\]\.supabase\.co/auth/v1/callback

1. Website URL: https://sorsa\.market
2. Save → go to \[Keys and Tokens\] tab → copy Client ID and Client Secret

__⚠  NOTE: Replace \[YOUR\-SUPABASE\-PROJECT\-ID\] with your actual Supabase project ID found in the Supabase dashboard URL\.__

Use case description — paste this when X asks what you use the API for:

*We use X's API solely for user authentication and login via OAuth 2\.0\. Upon signing in, we read the user's basic public profile information including display name, handle, and profile photo to create and identify their account on our platform\. We do not access tweets, followers, or any other data through the X API\.*

# __04\. SUPABASE AUTH SETUP__

## __4\.1 — Enable X OAuth in Supabase__

__STEP 5  Connect your X App to Supabase__

1. In Supabase go to \[Authentication\] → \[Providers\]
2. Find \[Twitter\] → toggle it ON
3. Paste your Twitter Client ID and Client Secret from Step 4
4. Click \[Save\]

__✓  TIP: Supabase handles the entire OAuth flow\. You just plug in the keys\.__

## __4\.2 — Database Schema__

In the old approach you would manually copy\-paste SQL into Supabase\. With Antigravity you don't need to do that — Antigravity will generate the full schema SQL for you based on your project and run it automatically\.

__🤖  ANTIGRAVITY: Schema Generation__

When you run Prompt P3\-0 below, Antigravity will:

- Read your full project context \(all your Phase 2 pages and data structures\)
- Generate the complete Supabase database schema tailored to Sorsa\.market
- Output the SQL for you to paste into the Supabase SQL Editor in one go
- Create all tables: profiles, brand\_profiles, creator\_profiles, campaigns, campaign\_participants, rewards, creator\_reviews, points\_log

__STEP 6  Run the schema in Supabase__

1. Run Prompt P3\-0 in Antigravity first \(Section 06 of this doc\)
2. Antigravity will output a SQL block
3. Go to Supabase → \[SQL Editor\] → \[New Query\]
4. Paste the entire SQL block Antigravity gives you
5. Click \[Run\] — you should see Success for each table

__✓  TIP: If any table fails, copy the error message and paste it back into Antigravity — it will fix it\.__

## __4\.3 — Storage Buckets__

__STEP 7  Create storage buckets for file uploads__

1. In Supabase go to \[Storage\] → \[New Bucket\]
2. Name: brand\-logos → toggle \[Public bucket\] ON → \[Save\]
3. New Bucket again → Name: proof\-screenshots → toggle \[Public bucket\] ON → \[Save\]

# __05\. ENVIRONMENT VARIABLES__

These are your secret keys\. They go in a \.env\.local file in your project root\. Never upload this file to GitHub\.

__STEP 8  Create your \.env\.local file__

1. In your sorsa\-market project folder create a file called: \.env\.local
2. Open it and paste this — replacing each \[VALUE\] with your real keys:

\# Supabase

VITE\_SUPABASE\_URL=\[Your Supabase Project URL\]

VITE\_SUPABASE\_ANON\_KEY=\[Your Supabase anon/public key\]

\# Sorsa / TweetScout API

VITE\_SORSA\_API\_KEY=\[Your Sorsa API key\]

VITE\_SORSA\_API\_BASE=https://api\.tweetscout\.io/v2

\# Base Chain

VITE\_BASE\_CHAIN\_ID=8453

VITE\_BASE\_RPC\_URL=https://mainnet\.base\.org

__⚠  NOTE: The file MUST be named \.env\.local — Vite reads it automatically\. Keep it out of GitHub\.__

__STEP 9  Add \.env\.local to \.gitignore__

1. Open \.gitignore in your project root
2. Make sure this line is there \(add it if not\):

\.env\.local

# __06\. ANTIGRAVITY PROMPTS — PHASE 3__

Same page\-by\-page approach as Phase 2\. Run prompts in order\. Test after each one before moving forward\. Antigravity has full context of your project so keep everything in the same session\.

__⚠  NOTE: Complete Steps 1–9 above before running any prompt\. The code won't work without Supabase and the \.env\.local file ready\.__

## __PROMPT P3\-0 — Install Packages \+ Generate DB Schema__

__── PROMPT START ──__

We are starting Phase 3 of Sorsa\.market\. Phase 2 frontend is complete\. Do not touch any existing page UI\. First:

PART A — Install these packages:

- @supabase/supabase\-js
- @supabase/auth\-helpers\-react
- @rainbow\-me/rainbowkit
- wagmi
- viem
- @tanstack/react\-query

PART B — Create these files:

- src/lib/supabase\.js — initialise Supabase client using import\.meta\.env\.VITE\_SUPABASE\_URL and VITE\_SUPABASE\_ANON\_KEY
- src/lib/rewardCalc\.js — export calculateReward\(sorsaScore, followerCount, totalImpressions\)\. Formula: base = sorsaScore / 10\. Follower multiplier interpolated linearly: 0→1\.00x, 2500→1\.35x, 3500→1\.49x, 5000\+→1\.70x cap\. Impression multiplier interpolated linearly: 0→0\.50x, 1000→0\.70x, 3500→1\.20x, 5000\+→1\.50x cap\. Impressions capped at 5000 before calculation\. Return \{ base, followerMult, impressionMult, final \}\.
- src/lib/sorsaApi\.js — export fetchSorsaScore\(xHandle\) and fetchPostImpressions\(tweetIds\[\]\) using VITE\_SORSA\_API\_KEY and VITE\_SORSA\_API\_BASE
- src/context/AuthContext\.jsx — React context exposing: user, role \(brand|creator\), session, loading, signOut

PART C — Generate the full Supabase database schema SQL for Sorsa\.market based on the project structure\. Include all tables needed for: user profiles \(brand and creator\), brand profiles \(multiple per account\), campaigns, campaign participants, rewards, creator reviews, and points log\. Output the SQL as a complete block I can paste into the Supabase SQL Editor\.

Code only for Part A and B\. SQL only for Part C\. No explanations\.

__── PROMPT END ──__

__⚠  NOTE: After this prompt: paste the SQL output from Part C into Supabase SQL Editor and run it before continuing to P3\-1\.__

## __PROMPT P3\-1 — Supabase Auth \+ Protected Routes__

__── PROMPT START ──__

Phase 3 Sorsa\.market\. Supabase client and AuthContext are set up\. Now wire up auth and route protection\. Do not change any page UI\.

- Update src/main\.jsx — wrap the entire app with: SessionContextProvider \(from @supabase/auth\-helpers\-react\), AuthContext provider, RainbowKit WalletConnect provider configured for Base chain \(chainId 8453\)
- Update src/App\.jsx — add route protection: unauthenticated users trying to access /brand/\* or /creator/\* get redirected to /login\. Brand users cannot access /creator/\* and vice versa\.
- Create src/components/ProtectedRoute\.jsx — checks AuthContext, shows loading spinner while session loads, redirects to /login if no session
- Wrap all /brand/\* routes with ProtectedRoute requiring role=brand
- Wrap all /creator/\* routes with ProtectedRoute requiring role=creator

Code only\. No explanations\.

__── PROMPT END ──__

## __PROMPT P3\-2 — Creator X OAuth Login__

__── PROMPT START ──__

Phase 3 Sorsa\.market\. Wire up X OAuth for creator login\. The /auth/creator page UI stays the same — just make the button work\.

- Update /auth/creator — \[Connect with X\] button calls: supabase\.auth\.signInWithOAuth\(\{ provider: 'twitter', options: \{ redirectTo: window\.location\.origin \+ '/auth/callback' \} \}\)
- Create /auth/callback page — on mount: get session from Supabase, check if creator\_profile row exists for this user, if NOT: create creator\_profile using X handle and display name from OAuth metadata, set role = creator in profiles table, redirect to /creator/dashboard\. If EXISTS: just redirect to /creator/dashboard\.
- Add /auth/callback route to App\.jsx
- Update CreatorSidebar and TopBar — show real display name and X avatar from AuthContext instead of mock data

Code only\. No explanations\.

__── PROMPT END ──__

## __PROMPT P3\-3 — Brand Email \+ X Login__

__── PROMPT START ──__

Phase 3 Sorsa\.market\. Wire up brand authentication — email/password and X OAuth\. Page UIs stay the same\.

- Update /auth/brand — email form calls supabase\.auth\.signInWithPassword\(\{ email, password \}\)\. On success redirect to /brand/dashboard\. Show inline error on failure\.
- \[Continue with X\] button calls supabase\.auth\.signInWithOAuth with redirectTo: /auth/callback/brand
- Update /auth/brand/register — calls supabase\.auth\.signUp\(\{ email, password \}\), inserts profiles row with role=brand, redirects to /brand/profiles/new\. Show loading state on button\.
- Create /auth/callback/brand — handles X OAuth for brands, creates profiles row with role=brand if new user, redirects to /brand/dashboard
- Add /auth/callback/brand route to App\.jsx
- Update BrandSidebar and TopBar — show real user info from AuthContext

Code only\. No explanations\.

__── PROMPT END ──__

## __PROMPT P3\-4 — Wallet Connect on Base__

__── PROMPT START ──__

Phase 3 Sorsa\.market\. Wire up real wallet connection using RainbowKit on Base chain\.

- Update /creator/profile — replace mock \[Connect Wallet\] button with RainbowKit <ConnectButton /> component
- When wallet connects: save wallet address to creator\_profiles table in Supabase \(update wallet\_address column\)
- Display connected address truncated: first 6 chars \.\.\. last 4 chars
- Show Base chain name/logo next to address
- If wrong network: show \[Switch to Base\] button using wagmi switchChain
- Update /creator/wallet — show real connected wallet address, query rewards table from Supabase filtered by creator\_id instead of mock data

Code only\. No explanations\.

__── PROMPT END ──__

## __PROMPT P3\-5 — Sorsa API Integration__

__── PROMPT START ──__

Phase 3 Sorsa\.market\. Pull real creator data from the Sorsa \(TweetScout\) API on login and store it in Supabase\.

- Update /auth/callback — after creating creator\_profile row: call fetchSorsaScore\(xHandle\), save returned sorsa\_score and follower\_count to the creator\_profiles row
- Create src/hooks/useCreatorProfile\.js — fetches creator profile from Supabase, returns \{ profile, loading, error, refreshProfile \}\. refreshProfile re\-calls Sorsa API to update score and follower count\.
- Update /creator/profile — use useCreatorProfile hook, show real Sorsa Score and follower count, add \[Refresh Stats\] button that calls refreshProfile
- Update /creator/dashboard — use real data from useCreatorProfile for Sorsa Score and stats cards

Code only\. No explanations\.

__── PROMPT END ──__

## __PROMPT P3\-6 — Brand Profiles \(Real Data\)__

__── PROMPT START ──__

Phase 3 Sorsa\.market\. Replace mock brand profile data with real Supabase data\.

- Update /brand/profiles — query brand\_profiles WHERE owner\_id = current user id
- Update /brand/profiles/new — insert new row into brand\_profiles, upload logo to Supabase Storage bucket brand\-logos, save public URL to logo\_url
- Update /brand/profiles/:id — fetch and update single profile by id
- Update /brand/dashboard — brand profile switcher loads real profiles from Supabase, persist selected profile id in localStorage
- Create src/hooks/useBrandProfiles\.js — returns \{ profiles, selectedProfile, setSelectedProfile, loading \}

Code only\. No explanations\.

__── PROMPT END ──__

## __PROMPT P3\-7 — Campaign Creation \(Real Data\)__

__── PROMPT START ──__

Phase 3 Sorsa\.market\. Wire campaign creation to Supabase\. UI stays the same\.

- Update /brand/campaigns/new — save Page 1 data to React state and carry it to Page 2
- Update /brand/campaigns/new/budget — calculate platformFee = budget \* 0\.15 and netBudget = budget \- platformFee live as user types, validate base \+ performance bonus sums to netBudget, on \[Fund & Launch Campaign\] insert campaign row with status=live, redirect to /brand/campaigns/:newId
- Update /brand/campaigns — query campaigns joined with brand\_profiles WHERE owner\_id = current user
- Create src/hooks/useCampaigns\.js — returns \{ campaigns, loading, createCampaign, getCampaign \}

Code only\. No explanations\.

__── PROMPT END ──__

## __PROMPT P3\-8 — Creator Campaign Join Flow__

__── PROMPT START ──__

Phase 3 Sorsa\.market\. Wire up the creator campaign join flow\.

- Update /creator/campaigns — query campaigns WHERE status=live, real data
- Update /creator/campaigns/:id — real campaign data from Supabase
- \[Join Campaign\] — check if creator already joined\. If not: insert campaign\_participants row with status=active, insert points\_log row \(event=joined, points=5\), update creator sorsa\_points \+5
- X follow requirement — show campaign x\_handle\_to\_follow as a link to https://x\.com/\[handle\]\. After clicking, show \[I followed them — Join Now\] button to complete the join
- Update /creator/active — query campaign\_participants WHERE creator\_id = current user AND status IN \(active, submitted, revision\), joined with campaigns table

Code only\. No explanations\.

__── PROMPT END ──__

## __PROMPT P3\-9 — Proof Submission \+ Reward Calculation__

__── PROMPT START ──__

Phase 3 Sorsa\.market\. Wire proof submission and the reward calculation engine\.

- Update /creator/active/:id — on \[Submit Proof\]: upload screenshot to Supabase Storage proof\-screenshots, save URL, save proof\_url, set participant status=submitted, insert points\_log \(event=submitted, points=10\), update sorsa\_points \+10
- After saving proof: call fetchPostImpressions\(\[tweetId\]\) from sorsaApi\.js using the submitted post URL, save total\_impressions to campaign\_participants row
- Run calculateReward\(sorsaScore, followerCount, totalImpressions\) from rewardCalc\.js, save follower\_mult, impression\_mult, and calculated\_reward to the participant row
- Show creator their estimated reward on the confirmation screen: 'Your estimated reward: $\[amount\] USDC'
- Update /brand/campaigns/:id submissions tab — query real campaign\_participants data, show proof links and calculated rewards

Code only\. No explanations\.

__── PROMPT END ──__

## __PROMPT P3\-10 — Brand Review \+ Creator Rating__

__── PROMPT START ──__

Phase 3 Sorsa\.market\. Wire brand proof review and creator rating\.

- \[Approve\] button: update participant status=approved, set approved\_at, insert rewards row \(status=pending, amount=calculated\_reward\), insert points\_log for creator \(event=completed, points=25\), update creator sorsa\_points \+25 and campaigns\_completed \+1
- \[Request Revision\] button: update participant status=revision
- Star rating \(1–5\): insert creator\_reviews row, recalculate creator's sorsa\_score as average of all their ratings × 20 \(to get 0–100 scale\), update sorsa\_score in creator\_profiles
- Bonus points: rating=5 → \+15 sorsa\_points, rating=4 → \+8 sorsa\_points
- Update /creator/profile and /creator/dashboard to reflect updated sorsa\_score and sorsa\_points

Code only\. No explanations\.

__── PROMPT END ──__

## __PROMPT P3\-11 — Leaderboard \(Real Data\)__

__── PROMPT START ──__

Phase 3 Sorsa\.market\. Wire leaderboard with real Supabase data\.

- Update /creator/leaderboard — query creator\_profiles, order by sorsa\_score DESC by default, by sorsa\_points for points view, by campaigns\_completed for campaigns view
- Highlight current logged\-in creator's row
- Show real rank numbers based on sort order
- Top 3 display uses real query data

Code only\. No explanations\.

__── PROMPT END ──__

# __07\. DEPLOYING TO VERCEL__

__STEP 10  Push to GitHub__

1. Create a new private GitHub repo called sorsa\-market
2. In your project folder run:

git init

git add \.

git commit \-m 'Phase 3 complete'

git remote add origin \[your GitHub repo URL\]

git push \-u origin main

__⚠  NOTE: Make sure \.env\.local is in \.gitignore before pushing\. Never push your API keys\.__

__STEP 11  Deploy on Vercel__

1. Go to vercel\.com → sign in with GitHub
2. Click \[Add New Project\] → import sorsa\-market repo
3. Vercel auto\-detects Vite → click \[Deploy\]
4. Once deployed go to \[Project Settings\] → \[Environment Variables\]
5. Add each key from your \.env\.local one by one and redeploy

__STEP 12  Update X Developer App callback URL__

1. Go back to developer\.twitter\.com → your Sorsa Market App settings
2. The Callback URI should already be correct — it points to Supabase not Vercel:

https://\[your\-supabase\-id\]\.supabase\.co/auth/v1/callback

__✓  TIP: Supabase handles the OAuth redirect back to your app automatically\. No change needed here unless you changed your Supabase project\.__

__STEP 13  Connect custom domain__

1. In Vercel go to your project → \[Settings\] → \[Domains\]
2. Add: sorsa\.market
3. Add the DNS records Vercel shows you to your domain registrar
4. Wait for DNS propagation — usually under 30 minutes

# __08\. PHASE 3 TESTING CHECKLIST__

Go through every item below before calling Phase 3 complete\. Test on both mobile and desktop\.

## __Auth__

- Creator logs in with real X account successfully
- Creator profile auto\-created in Supabase on first login
- Brand registers with email and password
- Brand logs in with X
- Brand cannot access /creator/\* pages
- Creator cannot access /brand/\* pages
- Sign out clears session and redirects to /login
- Page refresh keeps user logged in

## __Wallet__

- Creator connects MetaMask or Coinbase Wallet
- Wallet address saves to Supabase creator\_profiles
- Wrong network shows \[Switch to Base\] button
- Wallet address displays truncated correctly

## __Brand Flow__

- Brand creates profile with logo upload — saves to Supabase
- Brand switches between multiple profiles
- Brand creates campaign — saves to Supabase with status=live
- 15% fee calculates correctly, net budget splits correctly
- Campaign appears in /brand/campaigns list

## __Creator Flow__

- Live campaigns appear in /creator/campaigns from Supabase
- Creator joins campaign — row created in campaign\_participants
- Joined campaign appears in Active Campaigns tab
- Creator submits proof — screenshot uploads to Supabase Storage
- Sorsa API fetches real impressions from the submitted post
- Calculated reward displays correctly

## __Reward Formula Verification__

- Score 150, 2\.5k followers, 1k impressions → $14\.18
- Score 500, 5k followers, 5k impressions → $127\.50
- Impressions above 5k still cap at 1\.50x — does not increase further

## __Points \+ Leaderboard__

- Join campaign → \+5 points
- Submit proof → \+10 points
- Campaign completed → \+25 points
- Leaderboard shows real rankings
- Logged\-in creator's row is highlighted

__SORSA\.MARKET — PHASE 3 DOCUMENT v2\.0__

Set up 3 accounts\. Run prompts P3\-0 to P3\-11\. Deploy\. Test\.

