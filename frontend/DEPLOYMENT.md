# TeaTree Chat Frontend - Vercel Deployment Guide

## Prerequisites

- GitHub account
- Vercel account (sign up at vercel.com)
- Backend deployed and accessible (e.g., on Render)

## Deployment Steps

### 1. Push to GitHub

Make sure your frontend code is pushed to a GitHub repository.

### 2. Import Project to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "New Project"
3. Import your GitHub repository
4. Select the `frontend` folder as the root directory
5. Vercel will automatically detect it's a Next.js project

### 3. Configure Environment Variables

In Vercel dashboard, go to your project settings and add these environment variables:

**Required Environment Variables:**

- `NEXT_PUBLIC_API_URL` = `https://your-backend-url.onrender.com/api`

Replace `your-backend-url.onrender.com` with your actual backend URL.

### 4. Deploy

Click "Deploy" and Vercel will build and deploy your frontend.

## Local Development Environment Variables

Create a `.env.local` file in the frontend directory:

```
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

## Build Configuration

The project is configured with:

- Framework: Next.js
- Build Command: `npm run build`
- Install Command: `npm install`
- Output Directory: `.next`

## Notes

- The frontend will automatically use the production API URL when deployed
- Make sure your backend CORS settings allow requests from your Vercel domain
- The backend should be deployed first before deploying the frontend
