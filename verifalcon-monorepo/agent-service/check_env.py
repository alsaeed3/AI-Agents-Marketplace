#!/usr/bin/env python3
"""
Environment Variable Validation Script

This script validates that all required environment variables are set
before starting the agent service. It prevents runtime errors from
missing configuration.

Usage:
    python check_env.py

Exit codes:
    0 - All required variables are set
    1 - One or more required variables are missing
"""

import os
import sys
from pathlib import Path
from typing import List, Tuple

# Required environment variables
REQUIRED_VARS = [
    ("PRIVATE_KEY", "Wallet private key for signing transactions (NEVER commit this)"),
    ("BSC_TESTNET_RPC_URL", "BSC Testnet RPC endpoint URL"),
    ("GEMINI_API_KEY", "Google Gemini API key for AI capabilities"),
]

# Optional but recommended variables
OPTIONAL_VARS = [
    ("AGENT_REGISTRY_ADDRESS", "Deployed AgentRegistry contract address"),
    ("PAYMENT_ROUTER_ADDRESS", "Deployed PaymentRouter contract address"),
    ("AGENT_ID", "ID of the registered agent (for reputation updates)"),
]

# ANSI color codes for terminal output
class Colors:
    RED = "\033[91m"
    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    BLUE = "\033[94m"
    RESET = "\033[0m"
    BOLD = "\033[1m"


def load_dotenv():
    """Load .env file if it exists."""
    env_path = Path(__file__).parent / ".env"
    
    if not env_path.exists():
        print(f"{Colors.YELLOW}⚠️  No .env file found at {env_path}{Colors.RESET}")
        print(f"{Colors.YELLOW}   Copy .env.example to .env and fill in your values.{Colors.RESET}")
        return False
    
    # Simple .env parser (no external dependencies)
    with open(env_path, "r") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" in line:
                key, _, value = line.partition("=")
                key = key.strip()
                value = value.strip().strip('"').strip("'")
                if key and value:
                    os.environ.setdefault(key, value)
    
    return True


def check_variable(name: str, description: str) -> Tuple[bool, str]:
    """
    Check if an environment variable is set.
    
    Returns:
        Tuple of (is_set, value_preview)
    """
    value = os.environ.get(name)
    
    if not value:
        return False, ""
    
    # Mask sensitive values
    if "KEY" in name.upper() or "SECRET" in name.upper() or "PRIVATE" in name.upper():
        # Show only first 4 and last 4 characters
        if len(value) > 12:
            preview = f"{value[:4]}...{value[-4:]}"
        else:
            preview = "****"
    else:
        # Show full value for non-sensitive vars
        preview = value if len(value) <= 50 else f"{value[:47]}..."
    
    return True, preview


def main():
    """Main validation function."""
    print(f"\n{Colors.BOLD}{'='*60}{Colors.RESET}")
    print(f"{Colors.BOLD}  Agent Service - Environment Validation{Colors.RESET}")
    print(f"{Colors.BOLD}{'='*60}{Colors.RESET}\n")
    
    # Try to load .env file
    env_loaded = load_dotenv()
    
    # Check required variables
    print(f"{Colors.BOLD}Required Variables:{Colors.RESET}")
    print("-" * 40)
    
    missing_required: List[str] = []
    
    for name, description in REQUIRED_VARS:
        is_set, preview = check_variable(name, description)
        
        if is_set:
            print(f"{Colors.GREEN}✓{Colors.RESET} {name}")
            print(f"  {Colors.BLUE}→ {preview}{Colors.RESET}")
        else:
            print(f"{Colors.RED}✗{Colors.RESET} {name}")
            print(f"  {Colors.YELLOW}→ {description}{Colors.RESET}")
            missing_required.append(name)
    
    print()
    
    # Check optional variables
    print(f"{Colors.BOLD}Optional Variables:{Colors.RESET}")
    print("-" * 40)
    
    missing_optional: List[str] = []
    
    for name, description in OPTIONAL_VARS:
        is_set, preview = check_variable(name, description)
        
        if is_set:
            print(f"{Colors.GREEN}✓{Colors.RESET} {name}")
            print(f"  {Colors.BLUE}→ {preview}{Colors.RESET}")
        else:
            print(f"{Colors.YELLOW}○{Colors.RESET} {name}")
            print(f"  {Colors.YELLOW}→ {description}{Colors.RESET}")
            missing_optional.append(name)
    
    print()
    print("=" * 60)
    
    # Summary
    if missing_required:
        print(f"\n{Colors.RED}❌ FAILED: Missing {len(missing_required)} required variable(s):{Colors.RESET}")
        for name in missing_required:
            print(f"   - {name}")
        print(f"\n{Colors.YELLOW}Please set these variables in your .env file before starting.{Colors.RESET}")
        print(f"{Colors.YELLOW}Copy .env.example to .env and fill in your values.{Colors.RESET}")
        print()
        return 1
    
    if missing_optional:
        print(f"\n{Colors.YELLOW}⚠️  Warning: Missing {len(missing_optional)} optional variable(s).{Colors.RESET}")
        print(f"{Colors.YELLOW}   Some features may not work correctly.{Colors.RESET}")
    
    print(f"\n{Colors.GREEN}✅ All required environment variables are set!{Colors.RESET}")
    print(f"{Colors.GREEN}   Agent service is ready to start.{Colors.RESET}\n")
    
    return 0


if __name__ == "__main__":
    sys.exit(main())
