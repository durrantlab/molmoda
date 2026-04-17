"""
test.py: Drop-in replacement for the original test script.
Delegates entirely to the molmoda_tests package.
"""

from molmoda_tests.scripts.run_tests import main

if __name__ == "__main__":
    main()
