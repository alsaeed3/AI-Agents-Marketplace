#!/usr/bin/env node
/**
 * Environment Variable Validation Script (JavaScript Version)
 * 
 * This script validates that all required environment variables are set
 * before starting the agent service. It prevents runtime errors from
 * missing configuration.
 * 
 * Usage:
 *     node check_env.js
 * 
 * Exit codes:
 *     0 - All required variables are set
 *     1 - One or more required variables are missing
 */

const fs = require('fs');
const path = require('path');

// Required environment variables
const REQUIRED_VARS = [
    { name: 'PRIVATE_KEY', description: 'Wallet private key for signing transactions (NEVER commit this)' },
    { name: 'BSC_TESTNET_RPC_URL', description: 'BSC Testnet RPC endpoint URL' },
    { name: 'GEMINI_API_KEY', description: 'Google Gemini API key for AI capabilities' },
];

// Optional but recommended variables
const OPTIONAL_VARS = [
    { name: 'AGENT_REGISTRY_ADDRESS', description: 'Deployed AgentRegistry contract address' },
    { name: 'PAYMENT_ROUTER_ADDRESS', description: 'Deployed PaymentRouter contract address' },
    { name: 'AGENT_ID', description: 'ID of the registered agent (for reputation updates)' },
];

// ANSI color codes for terminal output
const Colors = {
    RED: '\x1b[91m',
    GREEN: '\x1b[92m',
    YELLOW: '\x1b[93m',
    BLUE: '\x1b[94m',
    RESET: '\x1b[0m',
    BOLD: '\x1b[1m',
};

/**
 * Load .env file if it exists
 * @returns {boolean} Whether .env file was found
 */
function loadDotenv() {
    const envPath = path.join(__dirname, '.env');
    
    if (!fs.existsSync(envPath)) {
        console.log(`${Colors.YELLOW}⚠️  No .env file found at ${envPath}${Colors.RESET}`);
        console.log(`${Colors.YELLOW}   Copy .env.example to .env and fill in your values.${Colors.RESET}`);
        return false;
    }
    
    // Simple .env parser (no external dependencies)
    const content = fs.readFileSync(envPath, 'utf-8');
    const lines = content.split('\n');
    
    for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine || trimmedLine.startsWith('#')) {
            continue;
        }
        
        const equalsIndex = trimmedLine.indexOf('=');
        if (equalsIndex !== -1) {
            const key = trimmedLine.slice(0, equalsIndex).trim();
            let value = trimmedLine.slice(equalsIndex + 1).trim();
            
            // Remove surrounding quotes if present
            if ((value.startsWith('"') && value.endsWith('"')) || 
                (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
            }
            
            if (key && value && !process.env[key]) {
                process.env[key] = value;
            }
        }
    }
    
    return true;
}

/**
 * Check if an environment variable is set
 * @param {string} name - Variable name
 * @returns {{ isSet: boolean, preview: string }}
 */
function checkVariable(name) {
    const value = process.env[name];
    
    if (!value) {
        return { isSet: false, preview: '' };
    }
    
    // Mask sensitive values
    const upperName = name.toUpperCase();
    if (upperName.includes('KEY') || upperName.includes('SECRET') || upperName.includes('PRIVATE')) {
        // Show only first 4 and last 4 characters
        if (value.length > 12) {
            return { isSet: true, preview: `${value.slice(0, 4)}...${value.slice(-4)}` };
        }
        return { isSet: true, preview: '****' };
    }
    
    // Show full value for non-sensitive vars
    if (value.length <= 50) {
        return { isSet: true, preview: value };
    }
    return { isSet: true, preview: `${value.slice(0, 47)}...` };
}

/**
 * Main validation function
 */
function main() {
    console.log(`\n${Colors.BOLD}${'='.repeat(60)}${Colors.RESET}`);
    console.log(`${Colors.BOLD}  Agent Service - Environment Validation${Colors.RESET}`);
    console.log(`${Colors.BOLD}${'='.repeat(60)}${Colors.RESET}\n`);
    
    // Try to load .env file
    loadDotenv();
    
    // Check required variables
    console.log(`${Colors.BOLD}Required Variables:${Colors.RESET}`);
    console.log('-'.repeat(40));
    
    const missingRequired = [];
    
    for (const { name, description } of REQUIRED_VARS) {
        const { isSet, preview } = checkVariable(name);
        
        if (isSet) {
            console.log(`${Colors.GREEN}✓${Colors.RESET} ${name}`);
            console.log(`  ${Colors.BLUE}→ ${preview}${Colors.RESET}`);
        } else {
            console.log(`${Colors.RED}✗${Colors.RESET} ${name}`);
            console.log(`  ${Colors.YELLOW}→ ${description}${Colors.RESET}`);
            missingRequired.push(name);
        }
    }
    
    console.log();
    
    // Check optional variables
    console.log(`${Colors.BOLD}Optional Variables:${Colors.RESET}`);
    console.log('-'.repeat(40));
    
    const missingOptional = [];
    
    for (const { name, description } of OPTIONAL_VARS) {
        const { isSet, preview } = checkVariable(name);
        
        if (isSet) {
            console.log(`${Colors.GREEN}✓${Colors.RESET} ${name}`);
            console.log(`  ${Colors.BLUE}→ ${preview}${Colors.RESET}`);
        } else {
            console.log(`${Colors.YELLOW}○${Colors.RESET} ${name}`);
            console.log(`  ${Colors.YELLOW}→ ${description}${Colors.RESET}`);
            missingOptional.push(name);
        }
    }
    
    console.log();
    console.log('='.repeat(60));
    
    // Summary
    if (missingRequired.length > 0) {
        console.log(`\n${Colors.RED}❌ FAILED: Missing ${missingRequired.length} required variable(s):${Colors.RESET}`);
        for (const name of missingRequired) {
            console.log(`   - ${name}`);
        }
        console.log(`\n${Colors.YELLOW}Please set these variables in your .env file before starting.${Colors.RESET}`);
        console.log(`${Colors.YELLOW}Copy .env.example to .env and fill in your values.${Colors.RESET}`);
        console.log();
        process.exit(1);
    }
    
    if (missingOptional.length > 0) {
        console.log(`\n${Colors.YELLOW}⚠️  Warning: Missing ${missingOptional.length} optional variable(s).${Colors.RESET}`);
        console.log(`${Colors.YELLOW}   Some features may not work correctly.${Colors.RESET}`);
    }
    
    console.log(`\n${Colors.GREEN}✅ All required environment variables are set!${Colors.RESET}`);
    console.log(`${Colors.GREEN}   Agent service is ready to start.${Colors.RESET}\n`);
    
    process.exit(0);
}

// Run main function
main();
