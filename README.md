# DSA Master

Every DSA resource under one roof: sheets, video courses, an AI dry-run visualizer, a dashboard with streaks, a daily goal, contests, and coding-profile stats.

Live: https://jatin-29.github.io/DSA-MASTER/

## Enable progress sync

Progress is saved in your browser. To sync it across devices with Google login:

1. Open https://console.firebase.google.com and click **Create a project**. Google Analytics is not needed.
2. **Build → Authentication → Get started → Sign-in method → Google → Enable → Save.**
3. **Authentication → Settings → Authorized domains → Add domain:** `jatin-29.github.io`
4. **Build → Firestore Database → Create database.** Choose any location and start in **production mode**.
5. In **Firestore → Rules**, paste this and click **Publish**:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{uid} {
         allow read, write: if request.auth != null && request.auth.uid == uid;
       }
     }
   }
   ```
6. **Project settings (⚙) → Your apps → Web (</>)**. Register an app with any nickname and copy the `firebaseConfig` object.
7. Put that object into `firebase-config.js` as `window.FIREBASE_CONFIG = { ... };` and push.

The config values are public identifiers, not secrets. The rules above let each signed-in user read and write only their own data.
