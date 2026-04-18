"""
test_next.py: Run guided tours for MolModa plugins and verify they complete.
Delegates entirely to the molmoda_tests package.

Usage:
    python test_next.py                     # all tour-capable plugins
    python test_next.py <plugin_id> ...     # specific plugin(s) only
"""

from molmoda_tests.scripts.test_tours import main

if __name__ == "__main__":
    main()
