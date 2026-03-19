# 🎨 Frontend Development Setup Guide (FREE & OPEN-SOURCE)
## PyCharm IDE Configuration for EV CSMS

---

## ✅ Configuration Files Created

The following files have been created in your project root:

```
~/projects1/ocpp_projekt_rollback6/evcsms/
├── .prettierrc ...................... Code formatter configuration (open-source)
├── .eslintrc.json ................... JavaScript linter configuration (open-source)
├── .editorconfig .................... Editor consistency rules (open-source)
└── FRONTEND_SETUP.md (this file) .... Installation guide
```

**All recommended tools are 100% free and open-source** ✅

---

## 🎯 Free & Open-Source Tools Recommended

### Option A: Use Command-Line Tools (No Plugins Needed)

This is the **recommended approach** for maximum flexibility and zero licensing concerns.

#### Install Prettier (Free, Open-Source)
```bash
cd ~/projects1/ocpp_projekt_rollback6/evcsms
npm install --save-dev prettier
```

#### Install ESLint (Free, Open-Source)
```bash
npm install --save-dev eslint
```

#### Run Prettier to Format Code
```bash
# Format all JavaScript files
npx prettier --write "web/assets/**/*.js"

# Format all HTML files
npx prettier --write "web/**/*.html"

# Format all CSS files
npx prettier --write "web/assets/**/*.css"
```

#### Run ESLint to Check Code
```bash
# Check all JavaScript files
npx eslint "web/assets/**/*.js"

# Fix automatically fixable issues
npx eslint "web/assets/**/*.js" --fix
```

#### Add npm Scripts (Recommended)

Edit `package.json` (create if it doesn't exist):
```json
{
  "name": "ev-csms-frontend",
  "version": "1.0.0",
  "description": "EV CSMS Frontend Assets",
  "scripts": {
    "format": "prettier --write 'web/**/*.{js,html,css}'",
    "lint": "eslint 'web/assets/**/*.js'",
    "lint:fix": "eslint 'web/assets/**/*.js' --fix",
    "format:check": "prettier --check 'web/**/*.{js,html,css}'"
  },
  "devDependencies": {
    "prettier": "^3.0.0",
    "eslint": "^8.0.0"
  }
}
```

Now you can use:
```bash
npm run format    # Auto-format all files
npm run lint      # Check for errors
npm run lint:fix  # Auto-fix errors
npm run format:check # Check without modifying
```

---

### Option B: Use Free PyCharm Plugins

If you prefer IDE integration, PyCharm Community Edition (free) supports:

#### 1. EditorConfig Support ✅ BUILT-IN (FREE)

**No installation needed** — PyCharm includes EditorConfig support by default.

**Verify it's enabled:**
- Settings → Editor → Code Style
- You should see ✅ "Enable EditorConfig support"

This will automatically enforce:
- 2-space indentation for web files
- UTF-8 encoding
- LF line endings
- No trailing whitespace

---

#### 2. Prettier Integration (Command-Line Wrapper)

Instead of a plugin, use Prettier via command line (already installed with npm above).

Configure PyCharm to run it:
1. Settings → Tools → External Tools
2. Click "+" to add new tool
3. Configure:
   - Name: `Prettier`
   - Program: `$ProjectFileDir$/node_modules/.bin/prettier`
   - Arguments: `--write $FileName$`
   - Working directory: `$ProjectFileDir$`

Now you can right-click a file → External Tools → Prettier to format it.

---

#### 3. ESLint Integration (Command-Line Wrapper)

Similarly, integrate ESLint:
1. Settings → Tools → External Tools
2. Click "+" to add new tool
3. Configure:
   - Name: `ESLint`
   - Program: `$ProjectFileDir$/node_modules/.bin/eslint`
   - Arguments: `$FilePath$ --fix`
   - Working directory: `$ProjectFileDir$`

Now you can right-click → External Tools → ESLint to lint/fix.

---

## ✨ Configuration Files (Already Created)

All these are **100% open-source** and free:

### `.prettierrc` — Code Formatting Rules (Open-Source)

What it does:
- Formats HTML, CSS, JavaScript automatically
- Enforces consistent style across your team
- Free and open-source: https://github.com/prettier/prettier

---

### `.eslintrc.json` — JavaScript Linting Rules (Open-Source)

What it does:
- Catches JavaScript errors and anti-patterns
- Free and open-source: https://github.com/eslint/eslint

---

### `.editorconfig` — Editor Consistency (Open-Source)

What it does:
- Enforces consistent whitespace/indentation
- Works across ALL editors (even VS Code, Sublime, vim)
- Free and open-source: https://github.com/editorconfig/editorconfig

---

## 🚀 Recommended Approach: Command-Line Tools

### Step 1: Install Node.js and npm

If not already installed:
```bash
# On Amazon Linux 2
sudo yum install -y nodejs npm

# Verify
node --version
npm --version
```

### Step 2: Create package.json

```bash
cd ~/projects1/ocpp_projekt_rollback6/evcsms

npm init -y
```

### Step 3: Install Prettier & ESLint

```bash
npm install --save-dev prettier eslint
```

### Step 4: Use the npm Scripts

```bash
# Format all code
npm run format

# Check for linting errors
npm run lint

# Auto-fix linting errors
npm run lint:fix

# Check formatting without modifying
npm run format:check
```

### Step 5: Add to Git

```bash
git add package.json package-lock.json .prettierrc .eslintrc.json .editorconfig
git commit -m "Add free/open-source formatting and linting tools (Prettier, ESLint)"
git push
```

---

## 📋 Quick Reference: Free Tools

| Tool | Cost | License | Installation |
|---|---|---|---|
| **Prettier** | Free | MIT | `npm install prettier` |
| **ESLint** | Free | MIT | `npm install eslint` |
| **EditorConfig** | Free | Open-Source | Built into PyCharm |
| **Node.js** | Free | MIT | System package |
| **npm** | Free | MIT | With Node.js |

---

## 🎯 Keyboard Shortcuts (PyCharm Built-in)

| Action | Shortcut |
|---|---|
| **Format Code** | Mac: Cmd+Alt+L | Windows/Linux: Ctrl+Alt+L |
| **Show Inspections** | Alt+Shift+I |
| **Run External Tool** | Ctrl+Alt+F (or configure) |

---

## 🔗 Share Configuration with Team

All configuration files are open-source and can be committed to Git:

```bash
cd ~/projects1/ocpp_projekt_rollback6/evcsms

git add .prettierrc .eslintrc.json .editorconfig package.json package-lock.json FRONTEND_SETUP.md
git commit -m "Add frontend development tools (free & open-source)"
git push
```

All team members can install the same tools:
```bash
npm install
npm run format    # Format all code
npm run lint      # Check for errors
```

---

## ⚙️ Automation: Format on Save (Optional)

### Using Git Hooks (Free, Open-Source)

Install `husky` and `lint-staged`:
```bash
npm install --save-dev husky lint-staged
npx husky install
npx husky add .husky/pre-commit "npx lint-staged"
```

Add to `package.json`:
```json
{
  "lint-staged": {
    "web/assets/**/*.js": "eslint --fix",
    "web/**/*.{js,html,css}": "prettier --write"
  }
}
```

Now code auto-formats on git commit (free, open-source).

---

## ✅ Installation Checklist (FREE & OPEN-SOURCE)

- [ ] Node.js installed (`node --version`)
- [ ] npm installed (`npm --version`)
- [ ] `package.json` created (`npm init -y`)
- [ ] Prettier installed (`npm install prettier`)
- [ ] ESLint installed (`npm install eslint`)
- [ ] `.prettierrc` file in project root ✓
- [ ] `.eslintrc.json` file in project root ✓
- [ ] `.editorconfig` file in project root ✓
- [ ] npm scripts working (`npm run format`, `npm run lint`)
- [ ] Tested formatting (`npm run format`)
- [ ] Tested linting (`npm run lint`)
- [ ] Committed all files to Git

---

## 🎯 Next Steps (Recommended)

1. **Install Node.js & npm** (if not already installed)
2. **Run `npm init -y`** (create package.json)
3. **Run `npm install --save-dev prettier eslint`** (install tools)
4. **Test the tools:**
   ```bash
   npm run format    # Format all code
   npm run lint      # Check for errors
   ```
5. **Commit to Git** (share with team)
6. **Done!** Your team now has professional-grade formatting & linting

---

## 🔗 Open-Source Resources

- **Prettier:** https://prettier.io/ (MIT License)
- **ESLint:** https://eslint.org/ (MIT License)
- **EditorConfig:** https://editorconfig.org/ (MIT License)
- **Node.js:** https://nodejs.org/ (MIT License)
- **npm:** https://www.npmjs.com/ (MIT License)

All tools are **100% free and open-source** with no licensing restrictions.

---

## 💡 Why Command-Line Tools Are Best

✅ **Free** — No license costs  
✅ **Open-Source** — Transparent and auditable  
✅ **Cross-Platform** — Works on Mac, Linux, Windows  
✅ **IDE-Agnostic** — Works with any editor  
✅ **Team-Friendly** — All team members use identical tools  
✅ **CI/CD Ready** — Easy to integrate into build pipelines  
✅ **Scriptable** — Automate with npm scripts or git hooks  

---

**Status:** ✅ Free & Open-Source Configuration Complete

**All tools are 100% free. No paid plugins or licenses needed!**


