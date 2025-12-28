# Reyaly Financial Calculator

A modern financial calculator built with React, TypeScript, and Firebase for managing bank accounts and expenses.

## Features

- **Bank Account Management** - Create, edit, and delete bank accounts with custom colors
- **Expense Tracking** - Add recurring and one-time expenses
- **Account Assignment** - Assign expenses to specific bank accounts
- **Dynamic Balance Calculation** - Real-time balance updates based on assigned expenses
- **Visual Indicators** - See which expenses are accounted for across accounts
- **Authentication** - Email/password and Google Sign-In support
- **Persistent Sessions** - Stay logged in across browser refreshes

## Tech Stack

- **Frontend**: React 19, TypeScript, Material-UI
- **Backend**: Firebase (Firestore, Authentication)
- **Build Tool**: Vite
- **State Management**: react-junco
- **Styling**: Material-UI, Emotion

## Getting Started

### Prerequisites
- Node.js (18 or higher)
- npm or bun
- Firebase project with Authentication and Firestore enabled

### Installation

1. Clone the repository
```bash
git clone [https://github.com/anclark686/reyaly-financial-calculator.git](https://github.com/anclark686/reyaly-financial-calculator.git)
cd reyaly-financial-calculator

2. Install dependencies
```bash
bun install
# or
npm install
```

3. Configure Firebase
 - Create a Firebase project at https://console.firebase.google.com
 - Enable Authentication (Email and Google providers)
 - Enable Firestore
 - Copy your Firebase config to src/firebase.ts
 - Start the development server

4. Start the development server
```bash
bun run dev
# or
npm run dev
```

## Usage
1. Sign Up/In - Create an account or use Google Sign-In
2. Add Bank Accounts - Create accounts with starting balances and colors
3. Add Expenses - Create recurring or one-time expenses
4. Assign Expenses - Link expenses to bank accounts
5. Track Balances - View real-time account balances

## Firebase Setup

### Authentication
 - Enable Email/Password provider
 - Enable Google provider
 - Configure authorized domains

### Firestore Rules
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /userData/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```