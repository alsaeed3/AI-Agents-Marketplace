# Verification Layer APRO

## Overview
The Verification Layer APRO is a Node.js project that implements a verification system using the APRO Oracle pattern. It provides an API for checking the validity of serial numbers against a mock database, simulating the behavior of an Oracle.

## Project Structure
```
verification-layer-apro
├── src
│   ├── app
│   │   └── api
│   │       └── verify
│   │           └── route.ts        # Next.js API route for serial number verification
│   ├── contracts
│   │   └── IAPRO_Oracle.sol        # Solidity interface for the APRO Oracle
│   └── lib
│       └── database.ts             # Utility functions for database operations
├── data
│   └── mock_database.json           # Mock data for the verification layer
├── package.json                     # npm configuration file
├── tsconfig.json                    # TypeScript configuration file
├── next.config.js                   # Next.js configuration file
└── README.md                        # Project documentation
```

## Setup Instructions
1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd verification-layer-apro
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Run the application**:
   ```bash
   npm run dev
   ```

4. **Access the API**:
   The API can be accessed at `http://localhost:3000/api/verify`.

## Usage
To verify a serial number, send a POST request to the `/api/verify` endpoint with the serial number in the request body. The API will respond with the validity status of the serial number.

## License
This project is licensed under the MIT License. See the LICENSE file for details.