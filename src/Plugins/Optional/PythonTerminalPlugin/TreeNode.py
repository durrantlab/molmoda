# import numpy as np
import sys


# Define a custom print function that appends messages to an output buffer
def custom_print(message):
    global output_buffer
    output_buffer.append(message)

# Replace sys.stdout with the custom object
# sys.stdout = custom_print()

output_buffer = []
# Print something
print("Hello World!")
custom_print("Hello World!")



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
