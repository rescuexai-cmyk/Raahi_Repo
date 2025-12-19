#!/bin/bash

# 🚀 Ride Hailing App - Quick Start Script
# This script automates the entire setup process

set -e  # Exit on any error

echo "🚀 Welcome to Ride Hailing App Quick Start!"
echo "This script will set up your development environment automatically."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check Node.js
    if ! command_exists node; then
        print_error "Node.js is not installed. Please install Node.js v18+ from https://nodejs.org/"
        exit 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js version must be 18 or higher. Current: $(node --version)"
        exit 1
    fi
    print_success "Node.js $(node --version) ✓"
    
    # Check npm
    if ! command_exists npm; then
        print_error "npm is not installed"
        exit 1
    fi
    print_success "npm $(npm --version) ✓"
    
    # Check PostgreSQL
    if ! command_exists psql; then
        print_warning "PostgreSQL not found. Please install PostgreSQL 14+ with PostGIS"
        echo "Installation guides:"
        echo "  macOS: brew install postgresql@14 postgis"
        echo "  Ubuntu: sudo apt install postgresql-14 postgresql-14-postgis-3"
        echo "  Windows: Download from https://www.postgresql.org/download/windows/"
        exit 1
    fi
    print_success "PostgreSQL ✓"
    
    # Check Redis
    if ! command_exists redis-cli; then
        print_warning "Redis not found. Please install Redis 7+"
        echo "Installation guides:"
        echo "  macOS: brew install redis"
        echo "  Ubuntu: sudo apt install redis-server"
        echo "  Windows: Download from https://redis.io/download"
        exit 1
    fi
    print_success "Redis ✓"
    
    # Check Git
    if ! command_exists git; then
        print_error "Git is not installed. Please install Git from https://git-scm.com/"
        exit 1
    fi
    print_success "Git ✓"
}

# Install global dependencies
install_global_deps() {
    print_status "Installing global dependencies..."
    
    # Install Expo CLI
    if ! command_exists expo; then
        print_status "Installing Expo CLI..."
        npm install -g @expo/cli
    fi
    print_success "Expo CLI ✓"
    
    # Install EAS CLI
    if ! command_exists eas; then
        print_status "Installing EAS CLI..."
        npm install -g @expo/eas-cli
    fi
    print_success "EAS CLI ✓"
}

# Setup project dependencies
setup_project() {
    print_status "Installing project dependencies..."
    
    # Install npm dependencies
    npm install
    print_success "npm dependencies installed ✓"
    
    # Install iOS dependencies (if on macOS)
    if [[ "$OSTYPE" == "darwin"* ]] && [ -d "ios" ]; then
        print_status "Installing iOS dependencies..."
        cd ios && pod install && cd ..
        print_success "iOS dependencies installed ✓"
    fi
}

# Setup environment variables
setup_environment() {
    print_status "Setting up environment variables..."
    
    if [ ! -f ".env" ]; then
        if [ -f ".env.example" ]; then
            cp .env.example .env
            print_success "Environment file created from template ✓"
            print_warning "Please edit .env file with your configuration"
        else
            print_error ".env.example file not found"
            exit 1
        fi
    else
        print_success "Environment file already exists ✓"
    fi
}

# Setup database
setup_database() {
    print_status "Setting up database..."
    
    # Check if PostgreSQL is running
    if ! pg_isready >/dev/null 2>&1; then
        print_warning "PostgreSQL is not running. Please start PostgreSQL service:"
        echo "  macOS: brew services start postgresql@14"
        echo "  Ubuntu: sudo systemctl start postgresql"
        echo "  Windows: Start PostgreSQL service from Services"
        read -p "Press Enter after starting PostgreSQL..."
    fi
    
    # Check if Redis is running
    if ! redis-cli ping >/dev/null 2>&1; then
        print_warning "Redis is not running. Please start Redis service:"
        echo "  macOS: brew services start redis"
        echo "  Ubuntu: sudo systemctl start redis-server"
        echo "  Windows: Start Redis service"
        read -p "Press Enter after starting Redis..."
    fi
    
    # Initialize database
    print_status "Initializing database schema..."
    node scripts/init-database.js
    print_success "Database initialized ✓"
}

# Start services
start_services() {
    print_status "Starting development services..."
    
    echo ""
    print_success "🎉 Setup completed successfully!"
    echo ""
    echo "Your Ride Hailing App is ready! Here's what you can do next:"
    echo ""
    echo "📱 Start the mobile app:"
    echo "   npm start                    # Start Expo development server"
    echo "   npm run ios                  # Start on iOS simulator"
    echo "   npm run android              # Start on Android emulator"
    echo ""
    echo "🔧 Start backend services:"
    echo "   npm run start:websocket      # Start WebSocket server"
    echo "   npm run dev:all              # Start all services together"
    echo ""
    echo "🗄️ Database tools:"
    echo "   psql -U ridehailing_user -d ridehailing  # Connect to database"
    echo "   redis-cli                    # Connect to Redis"
    echo ""
    echo "📖 Documentation:"
    echo "   See SETUP.md for detailed setup instructions"
    echo "   See docs/REALTIME_ARCHITECTURE.md for architecture details"
    echo ""
    
    # Ask if user wants to start the app immediately
    read -p "Would you like to start the Expo development server now? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_status "Starting Expo development server..."
        npm start
    fi
}

# Main execution
main() {
    echo "Starting setup process..."
    echo ""
    
    check_prerequisites
    echo ""
    
    install_global_deps
    echo ""
    
    setup_project
    echo ""
    
    setup_environment
    echo ""
    
    setup_database
    echo ""
    
    start_services
}

# Handle script interruption
trap 'echo -e "\n${RED}Setup interrupted.${NC} You can run this script again to continue."; exit 1' INT

# Run main function
main "$@"