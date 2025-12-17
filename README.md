# ExGen Client

A modern, high-performance Next.js frontend application for ExGen, an examination provider platform for MBO (Middle Vocational Education) institutions in the Netherlands..

## 🚀 Features

- **Modern Authentication**: Built with Clerk for secure user management and authentication
- **Exam Catalog**: Browse and purchase examination materials with credit-based system
- **Document Management**: View, download, and manage exam documents with version control
- **Workflow Processing**: AI-powered document generation and processing workflows
- **Credit System**: Integrated credit management for purchasing exam materials
- **Admin Panel**: Comprehensive administration tools for managing users, products, and workflows
- **Responsive Design**: Mobile-first design with Tailwind CSS and Radix UI components
- **PDF Viewer**: Built-in PDF viewing and management capabilities
- **Role-Based Access Control**: Secure access management based on user roles

## 🏗️ Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS with custom animations
- **UI Components**: Radix UI primitives with custom design system
- **Authentication**: Clerk
- **State Management**: React Context API + TanStack Query
- **Forms**: React Hook Form with Zod validation
- **PDF Processing**: PDF.js and React PDF
- **Performance**: Turbopack, optimized imports, and caching strategies

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── admin/             # Admin panel pages
│   ├── api/               # API routes and proxy endpoints
│   ├── catalogus/         # Exam catalog and management
│   ├── components/        # Reusable UI components
│   ├── contexts/          # React context providers
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Utility functions and helpers
│   └── workflows/         # Workflow processing interface
├── components/            # Global components
└── middleware.ts          # Next.js middleware configuration
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Access to Clerk authentication service
- Backend API server running

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd exgen-client
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env.local` file in the root directory:
   ```env
   NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_key
   CLERK_SECRET_KEY=your_clerk_secret
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🔧 Available Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run postinstall` - Copy PDF worker files

## 🌐 Environment Configuration

### Required Environment Variables

- `NEXT_PUBLIC_BACKEND_URL` - Backend API server URL
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk public key
- `CLERK_SECRET_KEY` - Clerk secret key

### Optional Environment Variables

- `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` - Redirect URL after sign in
- `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` - Redirect URL after sign up

## 🏛️ Architecture

### Core Components

- **Authentication System**: Clerk-based user management with role-based access control
- **Credit Management**: Integrated credit system for purchasing exam materials
- **Document Processing**: PDF viewing, downloading, and workflow management
- **Admin Interface**: User management, product administration, and system configuration

### State Management

- **Context API**: Global state for authentication, credits, and user roles
- **TanStack Query**: Server state management and caching
- **Local State**: Component-level state management with React hooks

### Performance Optimizations

- **Turbopack**: Fast development builds
- **Optimized Imports**: Reduced bundle sizes
- **Caching Strategies**: HTTP headers and Next.js caching
- **Code Splitting**: Automatic route-based code splitting

## 🔐 Authentication & Authorization

The application uses Clerk for authentication with the following features:

- **User Registration & Login**: Secure authentication flow
- **Role-Based Access Control**: Different permissions for students, teachers, and admins
- **Session Management**: Secure session handling with JWT tokens
- **Protected Routes**: Automatic route protection based on authentication status

## 💳 Credit System

The platform operates on a credit-based system:

- **Credit Purchase**: Users can buy credit packages
- **Product Costs**: Each exam material has a credit cost
- **Balance Management**: Real-time credit balance tracking
- **Purchase History**: Complete transaction history

## 📚 Exam Catalog

The catalog system provides:

- **Product Browsing**: Search and filter exam materials
- **Version Control**: Multiple versions of exam documents
- **Preview System**: Document previews before purchase
- **Download Management**: Secure document downloads

## 🔄 Workflow Processing

AI-powered document processing workflows:

- **Document Upload**: Drag-and-drop file uploads
- **Processing Steps**: Configurable workflow steps
- **Real-time Progress**: Live progress tracking
- **Result Management**: Generated document access

## 🎨 UI/UX Features

- **Modern Design**: Clean, professional interface
- **Responsive Layout**: Mobile-first responsive design
- **Accessibility**: WCAG compliant components
- **Dark Mode Support**: Theme switching capabilities
- **Loading States**: Smooth loading and transition animations

## 🚀 Deployment

### Production Build

```bash
npm run build
npm run start
```

### Docker Deployment

The application includes Docker configuration for containerized deployment.

### Railway Deployment

Includes `railway.json` for Railway platform deployment.

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## 📝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the terms specified in the LICENSE file.

## 🤝 Support

For support and questions:

- Check the documentation in the `/docs` folder
- Review the backend server documentation
- Contact the development team

## 🔗 Related Projects

- **Backend Server**: Python FastAPI backend with Alembic migrations
- **Documentation**: Comprehensive API and implementation documentation

---

**Built with ❤️ for the Dutch MBO education sector**
