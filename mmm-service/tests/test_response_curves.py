try:
    from meridian.analysis import analyzer
    print(dir(analyzer.Analyzer))
except ImportError:
    pass
