# Frontend Installation Guide

## Dependencies Installation

After creating your Vite React project, run this command to install all required dependencies:

```bash
npm install @reduxjs/toolkit react-redux react-router-dom axios react-hook-form lucide-react react-hot-toast prop-types
```

### Development Dependencies

```bash
npm install -D tailwindcss postcss autoprefixer @tailwindcss/forms @tailwindcss/typography
```

## Initialize Tailwind CSS

```bash
npx tailwindcss init -p
```

## Package.json Dependencies Overview

### Core Dependencies:
- **@reduxjs/toolkit**: Modern Redux with simplified setup
- **react-redux**: React bindings for Redux
- **react-router-dom**: Client-side routing
- **axios**: HTTP client for API calls
- **react-hook-form**: Performant forms with easy validation
- **lucide-react**: Beautiful icon library
- **react-hot-toast**: Toast notifications
- **prop-types**: Runtime type checking for React props

### Dev Dependencies:
- **tailwindcss**: Utility-first CSS framework
- **postcss**: CSS transformation tool
- **autoprefixer**: CSS vendor prefixing
- **@tailwindcss/forms**: Better form styling
- **@tailwindcss/typography**: Beautiful typography defaults

## Project Scripts (add to package.json)

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "eslint . --ext js,jsx --report-unused-disable-directives --max-warnings 0",
    "preview": "vite preview"
  }
}
```

## Environment Variables

Create `.env.local` file in your project root:

```env
VITE_API_BASE_URL=http://localhost:5000/api/v1
VITE_APP_NAME=Aaroth Fresh
```

## Next Steps

1. Run the installation commands above
2. Configure Tailwind CSS with the custom design system
3. Set up the folder structure
4. Configure Vite proxy for API calls
5. Create the Redux store and authentication system