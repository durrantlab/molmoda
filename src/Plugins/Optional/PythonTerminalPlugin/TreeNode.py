import sys

class CustomLogger:
    def __init__(self, stream):
        self.stream = stream

    def write(self, message):
        # Prepend ">>>" to the printed output
        self.stream.write("[CustomPrint]" + message)

sys.stdout = CustomLogger(sys.stdout)

molData = open("/treeNode.txt").read()

class TreeNode:
    def __init__(self, name, parent=None, data=None):
        self._name = name
        self._parent = parent
        self._children = []
        self._data = data
        if parent is not None:
            parent.addChild(self)

    def Coord(self):
        return self._data

    def name(self):
        return self._name

    def dataAsNumpy(self):
        return np.array(self._data)


myTree = TreeNode("root", data=molData)
