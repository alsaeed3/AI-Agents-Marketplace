# Test Assets Directory

This directory contains test images and other assets for testing the VeriFalcon APIs.

## Directory Structure

```
test-assets/
├── images/          # Test product images
│   ├── watches/     # Watch images
│   ├── bags/        # Bag images
│   └── general/     # General luxury items
└── README.md
```

## How to Add Test Images

### Method 1: Download Sample Images

```bash
cd test-assets/images

# Download sample luxury watch
curl -o watch-sample.jpg "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=800"

# Download sample luxury bag
curl -o bag-sample.jpg "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800"
```

### Method 2: Copy Your Own Images

Simply copy any `.jpg`, `.png`, or `.webp` files to this directory:

```bash
cp /path/to/your/image.jpg test-assets/images/
```

## Testing the API

Once you have images here, test with:

```bash
# From the monorepo root
curl -X POST http://localhost:3000/api/analyze \
  -F "image=@test-assets/images/watch-sample.jpg"

# Or with any other image
curl -X POST http://localhost:3000/api/analyze \
  -F "image=@test-assets/images/your-image.jpg"
```

## Quick Test

```bash
# Download sample and test in one go
cd verifalcon-monorepo
curl -o test-assets/images/test.jpg "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=800"
curl -X POST http://localhost:3000/api/analyze -F "image=@test-assets/images/test.jpg"
```
