Set WshShell = WScript.CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "C:\Users\denghaoyun\Documents\New project\yizhi-chuantou"
WshShell.Run "node server.js", 0, False
