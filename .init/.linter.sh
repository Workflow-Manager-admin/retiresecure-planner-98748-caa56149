#!/bin/bash
cd /home/kavia/workspace/code-generation/retiresecure-planner-98748-caa56149/retirement_frontend
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

