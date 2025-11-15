#!/bin/bash

echo "================================================"
echo "Reddit Review Analyzer API"
echo "================================================"
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "ERROR: .env file not found!"
    echo ""
    echo "Please create a .env file from .env.example:"
    echo "  1. Copy .env.example to .env"
    echo "  2. Fill in your Reddit and OpenAI API credentials"
    echo ""
    exit 1
fi

echo "Starting API server..."
echo "API will be available at: http://localhost:8000"
echo "API Documentation: http://localhost:8000/docs"
echo ""

python main.py

