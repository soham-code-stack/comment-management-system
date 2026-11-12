# Comment Desk: MERN Comment Management System

Threaded comments, likes, reports, and an admin moderation queue.

```
comment-system/
  server/   Express + MongoDB API   (runs on http://localhost:5000)
  client/   React + Vite website    (runs on http://localhost:5173)
```

---

## Part 1: One-time setup (Windows)

### 1. Install the tools
1. **Node.js LTS** from https://nodejs.org (run the installer, keep defaults).
2. **MongoDB**, choose ONE:
   - **Local (simplest):** install *MongoDB Community Server* from https://www.mongodb.com/try/download/community. In the installer keep **"Install MongoDB as a Service"** ticked. It then starts automatically with Windows.
   - **Cloud:** create a free cluster on https://www.mongodb.com/atlas (see "Using Atlas" below).
3. Open **PowerShell** and check:
   ```powershell
   node -v
   npm -v
   ```
   Both should print a version number.

### 2. Unzip the project
Unzip `comment-system.zip`, for example to `C:\projects\comment-system`.
Open that folder in **VS Code** (File > Open Folder) so you can use its built-in terminal.

### 3. Set up the server (Terminal 1)
Open a terminal (VS Code: Terminal > New Terminal) and run:
```powershell
cd C:\projects\comment-system\server
copy .env.example .env
notepad .env
```
Notepad opens. Set the values like this and save:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/comment-system
JWT_SECRET=put-a-long-random-string-here
CLIENT_URL=http://localhost:5173
```

| Key                         |              Meaning |
|---                          |                   ---|
| `PORT`                      |              Port the API listens on. Keep 5000. |
| `MONGO_URI`                 |              Database address. Use the line above for local MongoDB. Use `127.0.0.1`, not `localhost`. |
| `JWT_SECRET`                |              Secret used to sign login tokens. Any long random text. To generate one, run: `node -e "console.
                                             log(require('crypto').randomBytes(32).toString('hex'))"` and paste the output. |
| `CLIENT_URL`                |              Address of the website. Keep it as is. |

Then install and load the sample data:
```powershell
npm install
npm run seed
```
You should see `Seeded 4 users and 9 comments.`

### 4. Set up the client (Terminal 2)
Open a **second** terminal (click the `+` in the VS Code terminal panel):
```powershell
cd C:\projects\comment-system\client
npm install
```
**Client `.env`: not needed.** The dev server already forwards `/api` calls to port 5000.
Only if your API runs on a different address, create `client\.env` (copy `.env.example`) and set:
```env
VITE_API_URL=http://localhost:5000/api
```

### 5. Start both apps (first time)
```powershell
# Terminal 1 (server folder)
npm run dev
# prints: API running on :5000

# Terminal 2 (client folder)
npm run dev
# prints: Local: http://localhost:5173/
```
Open **http://localhost:5173** in your browser.

---

## Part 2: Every time after that (2nd, 3rd, ... run)

No installing, no `.env` editing, no seeding. Just:

1. Make sure MongoDB is running (automatic if installed as a service; for Atlas nothing to do).
2. Terminal 1:
   ```powershell
   cd C:\projects\comment-system\server
   npm run dev
   ```
3. Terminal 2:
   ```powershell
   cd C:\projects\comment-system\client
   npm run dev
   ```
4. Open http://localhost:5173.

To stop: press `Ctrl + C` in each terminal.

**Reset the demo data at any time:** in the `server` folder run `npm run seed`. This **deletes all users and comments** and reloads the samples.

---

## Sample accounts (created by `npm run seed`)

| Role | Email | Password |
|---|---|---|
| Admin | admin@example.com | Admin@123 |
| User | rahul@example.com | User@123 |
| User | priya@example.com | User@123 |
| User | sam@example.com | User@123 |

Sample comments include a thread with replies, a reported spam comment, a reported rude comment, and a hidden comment, so the Moderation tab has content right away. The data lives in `server/sample-data.json`; edit it and run `npm run seed` to change it.

### Try this
1. Sign in as `rahul@example.com`: post a comment, reply, like, edit, report.
2. Sign out, sign in as `admin@example.com`: open the **Moderation** tab, hide or restore the reported comments, delete one.
3. Register a brand-new account (it will be a normal user; only the very first account on an empty database becomes admin).


## Troubleshooting

| Problem | Fix |
|---|---|
| `npm : running scripts is disabled on this system` | Run once in PowerShell: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`, then retry. |
| `MongoDB connection failed` | Local: open **Services** (Win+R, `services.msc`), start **MongoDB Server**. Atlas: check your IP is allowed and the password is correct. |
| `secretOrPrivateKey must have a value` | `JWT_SECRET` is missing in `server\.env`. Restart the server after editing `.env`. |
| Website loads but comments fail / network error | The server (Terminal 1) is not running, or it is not on port 5000. |
| `Port 5000 already in use` | Change `PORT` in `server\.env`, and set `VITE_API_URL` in `client\.env` to match. Restart both. |
| Changed `.env` but nothing happens | Stop (`Ctrl + C`) and start the server again; `.env` is read only at startup. |
| Cannot see Moderation tab | Only admins see it. Sign in as `admin@example.com`. |

## API reference
| Method | Route | Access |
|---|---|---|
| POST | /api/auth/register, /api/auth/login | public |
| GET | /api/auth/me | user |
| GET | /api/comments (`?all=1` for admins) | public |
| POST | /api/comments | user |
| PUT / DELETE | /api/comments/:id | owner (delete: owner or admin) |
| POST | /api/comments/:id/like, /report | user |
| PATCH | /api/comments/:id/status | admin |
