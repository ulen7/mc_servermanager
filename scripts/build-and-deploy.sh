#!/bin/bash
# build-and-deploy.sh - Unified Minecraft Server and Web Console Deployment

set -euo pipefail

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DEPLOYMENT_DIR="$PROJECT_ROOT/deployment"
TEMPLATE_DIR="$DEPLOYMENT_DIR/templates/web-console"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory structure
check_project_structure() {
    log_info "Checking project structure..."
    
    if [ ! -f "$DEPLOYMENT_DIR/mc-deploy-wizard.sh" ]; then
        log_error "mc-deploy-wizard.sh not found in deployment directory"
        log_error "Expected location: $DEPLOYMENT_DIR/mc-deploy-wizard.sh"
        exit 1
    fi
    
    if [ ! -d "$TEMPLATE_DIR" ]; then
        log_warning "Web console template directory not found. Creating structure..."
        mkdir -p "$TEMPLATE_DIR"/{src,views,docker}
        
        # Check if we have the web console files in the current directory
        if [ -f "./src/app.js" ] && [ -f "./views/console.ejs" ]; then
            log_info "Found web console files in current directory, copying to template..."
            cp -r ./src "$TEMPLATE_DIR/"
            cp -r ./views "$TEMPLATE_DIR/"
            cp -r ./docker "$TEMPLATE_DIR/"
            cp ./package.json "$TEMPLATE_DIR/"
            log_success "Web console files copied to template directory"
        else
            log_error "Web console template files not found"
            log_error "Please ensure you have the web console files (src/, views/, docker/, package.json)"
            exit 1
        fi
    fi
    
    log_success "Project structure validated"
}

# Build web console components
build_web_console() {
    log_info "Building web console components..."
    
    # Ensure all required files exist
    local required_files=(
        "$TEMPLATE_DIR/src/app.js"
        "$TEMPLATE_DIR/views/login.ejs"
        "$TEMPLATE_DIR/views/console.ejs"
        "$TEMPLATE_DIR/docker/Dockerfile"
        "$TEMPLATE_DIR/package.json"
    )
    
    for file in "${required_files[@]}"; do
        if [ ! -f "$file" ]; then
            log_error "Required file missing: $file"
            exit 1
        fi
    done
    
    # Create .env template
    cat > "$TEMPLATE_DIR/.env.template" <<EOF
# Web Console Configuration Template
# These values will be populated by the deployment script

PORT=3000
ADMIN_USER=admin
ADMIN_PASS=your_secure_password
SESSION_SECRET=your_session_secret
MC_CONTAINER=mc_server
EOF
    
    log_success "Web console components built successfully"
}

# Validate the deployment script
validate_deployment_script() {
    log_info "Validating deployment script..."
    
    # Check if the script is executable
    if [ ! -x "$DEPLOYMENT_DIR/mc-deploy-wizard.sh" ]; then
        log_info "Making deployment script executable..."
        chmod +x "$DEPLOYMENT_DIR/mc-deploy-wizard.sh"
    fi
    
    # Basic syntax check
    if bash -n "$DEPLOYMENT_DIR/mc-deploy-wizard.sh"; then
        log_success "Deployment script syntax is valid"
    else
        log_error "Deployment script has syntax errors"
        exit 1
    fi
}

# Create deployment package
create_deployment_package() {
    log_info "Creating deployment package..."
    
    local package_name="minecraft-server-manager-$(date +%Y%m%d-%H%M%S)"
    local package_dir="/tmp/$package_name"
    
    # Create temporary package directory
    mkdir -p "$package_dir"
    
    # Copy all necessary files
    cp -r "$DEPLOYMENT_DIR" "$package_dir/"
    
    # Create archive
    local archive_path="$PROJECT_ROOT/${package_name}.tar.gz"
    (cd /tmp && tar -czf "$archive_path" "$package_name")
    
    # Cleanup
    rm -rf "$package_dir"
    
    log_success "Deployment package created: $archive_path"
    echo "Package contents:"
    tar -tzf "$archive_path" | head -20
    if [ "$(tar -tzf "$archive_path" | wc -l)" -gt 20 ]; then
        echo "... and $(($(tar -tzf "$archive_path" | wc -l) - 20)) more files"
    fi
}

# Run deployment locally for testing
test_deployment() {
    log_info "Testing deployment locally..."
    log_warning "This will run the deployment script in test mode"
    
    # Create a test directory
    local test_dir="/tmp/minecraft-test-deployment"
    rm -rf "$test_dir"
    mkdir -p "$test_dir"
    
    # Copy deployment files
    cp -r "$DEPLOYMENT_DIR"/* "$test_dir/"
    
    cd "$test_dir"
    
    log_info "Deployment files ready for testing in: $test_dir"
    log_info "You can now run: cd $test_dir && ./mc-deploy-wizard.sh"
    log_warning "Remember to clean up the test directory when done"
}

# Show usage information
show_usage() {
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  build      - Build and validate all components"
    echo "  package    - Create deployment package"
    echo "  test       - Set up local test environment"
    echo "  deploy     - Run the deployment script directly"
    echo "  help       - Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 build           # Build and validate everything"
    echo "  $0 package         # Create deployable package"
    echo "  $0 test            # Set up test environment"
}

# Main execution logic
main() {
    local command="${1:-help}"
    
    echo "=== Minecraft Server Manager Build & Deploy ==="
    echo "Version: 2.0.0"
    echo ""
    
    case "$command" in
        "build")
            check_project_structure
            build_web_console
            validate_deployment_script
            log_success "Build completed successfully!"
            ;;
        "package")
            check_project_structure
            build_web_console
            validate_deployment_script
            create_deployment_package
            ;;
        "test")
            check_project_structure
            build_web_console
            validate_deployment_script
            test_deployment
            ;;
        "deploy")
            check_project_structure
            build_web_console
            validate_deployment_script
            log_info "Starting deployment..."
            exec "$DEPLOYMENT_DIR/mc-deploy-wizard.sh"
            ;;
        "help"|*)
            show_usage
            ;;
    esac
}

# Run main function with all arguments
main "$@"