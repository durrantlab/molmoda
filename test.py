"""
test.py: Drop-in replacement for the original test script.
Delegates entirely to the molmoda_tests package.
"""

from molmoda_tests.scripts.run_tests import main

# NOTE: If this ever starts running really slow, you probably aren't
# using arm64-compiled version of chrome.

# brew install chromedriver (to update too)

# Java on mac can run in both arm64 and x86_64. This forces arm64, since
# you test on a mac.

if __name__ == "__main__":
    main()
