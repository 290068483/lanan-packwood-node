Sub 遍历列表记录文件各和json时间()
    Dim folderPath As String
    Dim fso As Object
    Dim folder As Object
    Dim fileName As Object
        
    Dim jsonPath As String
    Dim fsoJson As Object
    Dim jsonFile As Object

    On Error Resume Next
    ' 打包文件夹路径
    folderPath = ThisWorkbook.Sheets("配置").Cells(3, 3).text
    ' 创建 FileSystemObject 对象
    Set fso = CreateObject("Scripting.FileSystemObject")
    Set fsoJson = CreateObject("Scripting.FileSystemObject")

    ' 获取文件夹对象
    Set folder = fso.GetFolder(folderPath)
    
'1、列表里增加文件名------------------>>>>查找local文件夹，将没有的子文件夹名称列入表格中，并获取它的json文件时间
    Dim ws As Worksheet, rng As Range, maxRow%, newN%
    Dim fileAndT As Variant
    
    ' 获取列表中的文件名和json时间并写入数组
    maxRow = ThisWorkbook.Sheets("记录列表").Cells(ThisWorkbook.Sheets("记录列表").Rows.count, 2).End(xlUp).ROW '最大行号
    Set ws = ThisWorkbook.Sheets("记录列表")
    Set rng = ThisWorkbook.Sheets("记录列表").Range("B1:C" & maxRow)
    fileAndT = rng.value
    
    '循环local文件夹，将没有的文件名写入列表
    Dim nominalName As String           '文件夹的显示名称
    For Each fileName In folder.SubFolders
        '循环表格中生产中记录，匹配是否有该文件夹名称
        For n = 1 To UBound(fileAndT)
            '获取显示名称
            If InStrRev(fileName.Name, "·") > 0 Then
                nominalName = Left(fileName.Name, InStrRev(fileName.Name, "·") - 1)
            Else
                nominalName = fileName.Name
            End If
            If InStrRev(fileName.Name, "_") > 0 Then
                nominalName = Left(nominalName, InStrRev(nominalName, "_") - 1)
            Else
                nominalName = nominalName
            End If
            '判断名称
            If nominalName = fileAndT(n, 1) Then
                Exit For        '找到同名文件，跳出循环
            End If
        Next n
        '未找到同名列表，则将文件夹名称和json文件时间写入列表
        If n > UBound(fileAndT) Then
            newN = newN + 1                                                     '最大行之后的新增计数
            jsonPath = folderPath & "\" & fileName.Name & "\packages.json"      'json文件路径
            Set jsonFile = fsoJson.GetFile(jsonPath)                            '创建FileSystemObject对象
            ws.Cells(maxRow + newN, 2) = nominalName                            '将文件名写入列表
            ws.Cells(maxRow + newN, 3) = jsonFile.DateLastModified              '将json时间写入列表
        End If
    Next
    Set ws = Nothing
    Set rng = Nothing
    Set jsonFile = Nothing
'1、增加文件<<<<------------------查找local文件夹，将没有的子文件夹列如表格中，并获取它的json文件时间

'2、减除文件------------------>>>>循环列表文件名，将local文件夹里没有的文件名从列表中去除
    ' 获取列表中的文件名和json时间并写入数组
    maxRow = ThisWorkbook.Sheets("记录列表").Cells(ThisWorkbook.Sheets("记录列表").Rows.count, 2).End(xlUp).ROW   '最大行号
    Set ws = ThisWorkbook.Sheets("记录列表")
    Set rng = ThisWorkbook.Sheets("记录列表").Range("B1:C" & maxRow)
    fileAndT = rng.value
    
    Dim newFile() As Variant, count%, localFolderNo%
    localFolderNo = folder.SubFolders.count
    ReDim newFile(1 To localFolderNo, 1 To 2)
    
    For n = 1 To UBound(fileAndT)
        For Each fileName In folder.SubFolders
            '获取显示名称
            If InStrRev(fileName.Name, "·") > 0 Then
                nominalName = Left(fileName.Name, InStrRev(fileName.Name, "·") - 1)
            Else
                nominalName = fileName.Name
            End If
            If InStrRev(fileName.Name, "_") > 0 Then
                nominalName = Left(nominalName, InStrRev(nominalName, "_") - 1)
            Else
                nominalName = nominalName
            End If
            '判断名称
            If nominalName = fileAndT(n, 1) And fileName.Name <> "0 打包归档" Then      '在local文件夹里找到列表中此名子文件夹
                count = count + 1                               '记录有效文件名数量
                newFile(count, 1) = fileAndT(n, 1)              '将文件名写入数组
                newFile(count, 2) = fileAndT(n, 2)              '将json时间写入数组
                Exit For
            End If
        Next fileName
    Next n
    ws.Range("B:C").ClearContents                               '删除原先数据
    ws.Range("B1").Resize(localFolderNo, 2).value = newFile     '将得到的新数组写入单元格

    Set fileName = Nothing
'2、减除文件<<<<------------------循环列表文件名，将local文件夹里没有的文件名从列表中去除

'3、刷新文件------------------>>>>根据json文件的保存时间，刷新打包记录
    '循环local文件夹中
    For Each fileName In folder.SubFolders
    
        ' 获取列表中的文件名和json时间并写入数组
        maxRow = ThisWorkbook.Sheets("记录列表").Cells(ThisWorkbook.Sheets("记录列表").Rows.count, 2).End(xlUp).ROW '最大行号
        Set ws = ThisWorkbook.Sheets("记录列表")
        Set rng = ThisWorkbook.Sheets("记录列表").Range("B1:C" & maxRow)
        fileAndT = rng.value
        
        '判断各子文件夹里json文件的当前保存时间与列表记录保存时间是否匹配
        For n = 1 To UBound(fileAndT)
            '获取显示名称
            If InStrRev(fileName.Name, "·") > 0 Then
                nominalName = Left(fileName.Name, InStrRev(fileName.Name, "·") - 1)
            Else
                nominalName = fileName.Name
            End If
            If InStrRev(fileName.Name, "_") > 0 Then
                nominalName = Left(nominalName, InStrRev(nominalName, "_") - 1)
            Else
                nominalName = nominalName
            End If
            '判断名称
            If nominalName = fileAndT(n, 1) Then
                jsonPath = folderPath & "\" & fileName.Name & "\packages.json"      'json文件路径
                Set jsonFile = fsoJson.GetFile(jsonPath)                            '创建FileSystemObject对象
                If fileAndT(n, 2) <> jsonFile.DateLastModified Then
                    Call 更新打包记录(folderPath & "\" & fileName.Name, n)
                End If
                Exit For
            End If
        Next n
    Next fileName
            
    Set fileName = Nothing
    Set jsonFile = Nothing
'3、减除文件<<<<------------------根据json文件的保存时间，刷新打包记录
    
    Set fso = Nothing
    Set fsoJson = Nothing
    Set folder = Nothing
End Sub

Sub 更新打包记录(ByVal folderPath As String, ByVal nRow As Integer)
'Sub 更新打包记录()              '测试用
                        
'1、------------------>>>>获取json数据
    Dim filePath As String
    Dim jsonString As String
    Dim sc As Object
    Dim jsonObject As Object
    Dim stream As Object
    
    ' 指定 JSON 文件路径
    filePath = folderPath & "\packages.json" ' 修改为你的 JSON 文件路径
                        'folderPath = "C:\Program Files (x86)\MPM\temp\local\250313 新建文件夹_F2501180991"                  '测试用
                        'filePath = "C:\Program Files (x86)\MPM\temp\local\250313 新建文件夹_F2501180991\packages.json"      '测试用
    
    ' 读取 JSON 文件内容
    Set stream = CreateObject("ADODB.Stream")
    stream.Type = 2
    stream.Charset = "utf-8"
    stream.Open
    stream.LoadFromFile filePath
    jsonString = stream.ReadText
    stream.Close
    
    ' 使用 JSONConverter 解析 JSON 字符串
    Set jsonObject = JsonConverter.ParseJson(jsonString)
      
    Set stream = Nothing
'1、<<<<------------------获取json数据

'2、------------------>>>>生成已打包记录
    Dim app As Object
    Dim wb As Object
    Set app = CreateObject("Excel.Application")         ' 创建隐藏的 Excel 实例
    app.Visible = False                                 ' 隐藏 Excel 应用程序
    app.DisplayAlerts = False                           ' 禁用提示
    
    On Error Resume Next
    Set wb = app.Workbooks.Open(folderPath & "\打包记录.xlsx", ReadOnly:=False)
                'Set wb = Workbooks.Open(folderPath & "\打包记录.xlsx", ReadOnly:=False)       '测试用
                'wb.Activate                                                                   '测试用

    ' 使用Add方法创建一个新的工作表
    Dim ws As Object
    If wb.Sheets("已打包") Is Nothing Then
        Set ws = wb.Sheets.Add
        ws.Name = "已打包"
    End If
    Set ws = wb.Sheets("已打包")
'2、<<<<------------------生成已打包记录

'3、------------------>>>>循环板件明细，生成每块板件的打包记录
    '==设置标题区
    ws.Cells.Clear      ' 清空所有内容和格式
    ws.Range("A1").value = Left(wb.Sheets("板件明细").Range("A1"), Len(wb.Sheets("板件明细").Range("A1")) - 5) & _
                           "-已包板件"
    ws.Range("A2").value = "包号"
    ws.Range("B2").value = "房间名 柜体名"
    ws.Range("C2").value = "数量"
    ws.Range("D2").value = "打包时间"
    ws.Range("E2").value = "标签号"
    ws.Range("F2").value = "ID号"
    ws.Range("G2").value = "方案" & Chr(10) & "板号"
    ws.Range("H2").value = "基材和颜色"
    ws.Range("I2").value = "板件名"
    ws.Range("J2").value = "类型"
    ws.Range("K2").value = "尺寸"
        ws.Range("K3").value = "高"
        ws.Range("L3").value = "宽"
        ws.Range("M3").value = "厚"
    ws.Range("N2").value = "面积"
    ws.Range("O2").value = "备注"

    Dim UidArr() As String
    '==循环数据区
    Dim rowID As Integer
    rowID = 4                           '数据区的起始行是第4行
    For Each key In jsonObject          '遍历所有根数组（即各包）
        '循环各包里的各板件
        For n = 1 To key.Item("partIDs").count
            ws.Range("A" & rowID) = key.Item("packSeq")         '包号
            ws.Range("C" & rowID) = key.Item("packQty")         '包号
            ws.Range("D" & rowID) = key.Item("packDate")        '打包时间
            
            '得到的板件 panelID 写入数组
            ReDim Preserve UidArr(1 To rowID - 3)               '调整数组大小，并保留原有数据
            UidArr(rowID - 3) = key.Item("partIDs")(n)
            
            '总打包板件计数
            rowID = rowID + 1
        Next n
    Next key
    
    '==循环Uid号，查找xml文件，得到各ID号
    Dim xmlDoc As Object
    Dim xmlNodes As Object
    Dim xmlNode As Object
    Dim dict As Scripting.Dictionary
    Dim ID As String
    Dim panelID As String
  
    Set xmlDoc = CreateObject("MSXML2.DOMDocument")             ' 创建 XML 文档对象
    xmlDoc.async = False
    xmlDoc.validateOnParse = False
    If xmlDoc.Load(folderPath & "\files\svjData.xml") Then      ' 加载 XML 文件
        Set dict = New Scripting.Dictionary                     ' 创建字典对象
        Set xmlNodes = xmlDoc.SelectNodes("//Panel")            ' 使用 XPath 查找所有 item 元素
        For Each xmlNode In xmlNodes                            ' 遍历所有节点
            ID = xmlNode.getAttribute("ID")                     ' 获取 ID 属性值
            panelID = xmlNode.getAttribute("panelID")           ' 获取 panelID 属性值
            dict.Add panelID, ID                                ' 将 id 和 panelID 写入字典
        Next xmlNode
    End If
    
    For n = 4 To ws.Cells(ws.Rows.count, 1).End(xlUp).ROW
        ws.Cells(n, 6) = CStr(dict(UidArr(n - 3)))
        ws.Cells(n, 6).NumberFormat = "0"                       '禁止以科学计数法显示
    Next n

    Set xmlNodes = Nothing
    Set xmlDoc = Nothing
    Set dict = Nothing
    
    '==按包号重新排序
    Dim sortRange As Range                                                          ' 定义排序范围
    Set sortRange = ws.Range("A4:O" & ws.Cells(ws.Rows.count, 1).End(xlUp).ROW)     ' 更改为你的数据范围
    With ws.Sort
        .SortFields.Clear
        .SortFields.Add key:=ws.Range("A4:A" & ws.Cells(ws.Rows.count, 1).End(xlUp).ROW), SortOn:=xlSortOnValues, Order:=xlAscending, DataOption:=xlSortNormal
        .SetRange ws.Range("A4:AA" & ws.Cells(ws.Rows.count, 1).End(xlUp).ROW)      ' 排序范围
        .Header = xlNo                                                              ' 如果第一行是标题，则使用 xlYes
        .MatchCase = False
        .Orientation = xlTopToBottom
        .SortMethod = xlPinYin
        .Apply
    End With
    Set sortRange = Nothing
    
    '==循环生成板件的其它数据
    '将《板件明细》里的ID号和行号写入字典
    Dim idData As Scripting.Dictionary
    Set idData = New Scripting.Dictionary                       ' 创建字典对象
    For n = 6 To wb.Sheets("板件明细").Cells(wb.Sheets("板件明细").Rows.count, 1).End(xlUp).ROW
        idData.Add wb.Sheets("板件明细").Cells(n, 2).value, n
    Next n
    '用ID号根据字典，得到行号，并复制对应数据
    Dim dataArr As Variant, data2Arr() As Variant
    dataArr = Array(2, 5, 7, 8, 9, 10, 11, 12, 13, 14, 15)      '需要复制数据的列号
    data2Arr = Array(5, 1, 3, 4, 6, 7, 8, 9, 10, 11, 12)        '对应《板件明细》里的数据列号
    Dim idRow As String
    For n = 4 To ws.Cells(ws.Rows.count, 1).End(xlUp).ROW
        If idData.Exists(Right(ws.Cells(n, 6), 5)) Then
            idRow = idData(Right(ws.Cells(n, 6), 5))            '得到源行号
            For m = LBound(dataArr) To UBound(dataArr)          '循环各剩余列，复制数据
                ws.Cells(n, dataArr(m)) = wb.Sheets("板件明细").Cells(idRow, data2Arr(m))
            Next m
        Else                    '字典里如果没有该UID号，则柜体名里显示“此板未排版”
            ws.Cells(n, 9) = "<没有此板排版记录>"
            ws.Range("E" & n & ":O" & n).Interior.Color = RGB(255, 160, 160)
        End If

    Next n
'3、<<<<------------------循环板件明细，生成每块板件的打包记录


'4、------------------>>>>设置表格格式
    '==设置各列宽
    Dim maxRows As Integer      '最大行号
    maxRows = ws.Cells(ws.Rows.count, 1).End(xlUp).ROW
    
    Dim columnWidth() As Variant
    columnWidth = Array(5, 22, 4, 24, 4, 15, 8, 30, 20, 5, 6, 6, 4, 5, 30)
    For n = LBound(columnWidth) To UBound(columnWidth)
        ws.Columns(n + 1).columnWidth = columnWidth(n)
    Next n
    
    '==设置各行高
    ws.Rows.rowHeight = 17
    Dim rowHeight() As Variant
    rowHeight = Array(28, 14, 13)
    For n = LBound(rowHeight) To UBound(rowHeight)
        ws.Rows(n + 1).rowHeight = rowHeight(n)
    Next n

    '==设置字体
    With ws
        .Cells.Font.Name = "宋体"                   ' 设置字体
        .Cells.Font.Size = 9                        ' 设置字体大小
        .Cells.Font.Bold = False                    ' 设置字体加粗
        .Columns("A:D").Font.Size = 12
        .Rows("1:2").Font.Bold = True
        .Rows("1").Font.Size = 16
        .Rows("2").Font.Size = 10
        .Rows("3").Font.Size = 9
        .Range("E2").Font.Size = 6.5
    End With
    
    '==设置格式
    ws.Cells.HorizontalAlignment = xlCenter                                 ' 水平居中
    ws.Cells.VerticalAlignment = xlCenter                                   ' 垂直居中
    ws.Range("H4" & ":I" & maxRows).HorizontalAlignment = xlLeft            ' 居左
    ws.Range("O4" & ":O" & maxRows).HorizontalAlignment = xlLeft            ' 居左
    ws.Range("A1").Font.Color = RGB(200, 0, 0)                              ' 标题为红色

    '==设置边框线条
    With ws.Range("A2:O" & maxRows).Borders
        .LineStyle = xlContinuous                                   ' 设置框线样式为实线
        .Color = RGB(0, 0, 0)                                       ' 设置框线颜色为黑色
        .Weight = xlThin                                            ' 设置框线粗细为细线
    End With
    ws.Range("A2:O3").BorderAround LineStyle:=xlContinuous, Weight:=xlMedium        ' 设置框线为粗线

    '==合并单元格
    ws.Range("A1:O1").Merge
    ws.Range("K2:M2").Merge
    For n = 1 To 15                             '合并目录
        If n < 11 Or n > 13 Then
            ws.Range(ws.Cells(2, n), ws.Cells(3, n)).Merge
        End If
    Next n
    
    Dim packSeqText As String, count As Integer
    Dim cabText As String, cabName() As String, arrCount As Integer
    packSeqText = ws.Cells(4, 1).value
    ReDim cabName(1 To 1)                           '更新柜体名
    cabName(1) = ws.Cells(4, 2).value
    arrCount = 1                                    '同包号里不同柜体名称的数量
    
    '生成的数值为文本，会报感叹号，将这些文本转化为数值
    ws.Cells(4, 5).value = ws.Cells(4, 5).text * 1
    ws.Cells(4, 11).value = ws.Cells(4, 11).text * 1
    ws.Cells(4, 12).value = ws.Cells(4, 12).text * 1
    ws.Cells(4, 13).value = ws.Cells(4, 13).text * 1
    ws.Cells(4, 14).value = ws.Cells(4, 14).text * 1
    
    For n = 5 To maxRows + 1                            '合并同包板件
        '生成的数值为文本，会报感叹号，将这些文本转化为数值
        ws.Cells(n, 5).value = ws.Cells(n, 5).text * 1
        ws.Cells(n, 11).value = ws.Cells(n, 11).text * 1
        ws.Cells(n, 12).value = ws.Cells(n, 12).text * 1
        ws.Cells(n, 13).value = ws.Cells(n, 13).text * 1
        ws.Cells(n, 14).value = ws.Cells(n, 14).text * 1
        
        If packSeqText <> ws.Cells(n, 1).text Then          '与上一个包号不同
            If count > 0 Then                               '重复包号大于1次时，合并同包号相关的单元格
                ws.Range("A" & n - count - 1 & ":A" & n - 1).Merge
                ws.Range("B" & n - count - 1 & ":B" & n - 1).Merge
                ws.Range("C" & n - count - 1 & ":C" & n - 1).Merge
                ws.Range("D" & n - count - 1 & ":D" & n - 1).Merge
            End If
            
            If UBound(cabName) > 1 Then
                For nn = LBound(cabName) To UBound(cabName)
                    If cabText = "" Then
                        cabText = cabName(nn)
                    Else
                        If cabName(nn) <> "" Then cabText = cabText & Chr(10) & cabName(nn)
                    End If
                Next nn
                ws.Range("B" & n - count - 1 & ":B" & n - 1) = cabText
                ws.Range("B" & n - count - 1 & ":B" & n - 1).Interior.Color = RGB(255, 160, 160)
                cabText = ""                                    '同包号里不同柜体名称呈现文本
                arrCount = 1                                    '同包号里不同柜体名称的数量
            End If
            
            packSeqText = ws.Cells(n, 1).text               '则更新包号
            ReDim cabName(1 To 1)                           '更新柜体名
            cabName(1) = ws.Cells(n, 2).value               '更新柜体名
            
            ' 设置粗匣框线
            ws.Range("A" & n - count - 1 & ":O" & n - 1).BorderAround LineStyle:=xlContinuous, Weight:=xlMedium
            count = 0                                   '同包号计数清零
        Else                                            '与上一包号相同
            count = count + 1                           '则开始同包号计数
            '如果柜体名不相同，则多行显示所有不同的柜体名
            For nn = LBound(cabName) To UBound(cabName)
                If cabName(nn) = ws.Cells(n, 2).value Then
                    Exit For
                End If
            Next nn
            If nn > UBound(cabName) Then            'nn>数组上标，则意味着没有找到同名的柜体名称
                arrCount = arrCount + 1
                ReDim Preserve cabName(1 To arrCount)
                cabName(arrCount) = ws.Cells(n, 2).value
            End If
        End If
    Next n

'4、<<<<------------------设置表格格式


'5、------------------>>>>更新《板件明细》工作表
    '==循环《已打包》ID号，将对应的包号和打包时间写入《板件明细》对应列
    Dim mergedRange As Range                '各单元格的合并区域
    With wb.Sheets("板件明细")
        .Cells.Interior.Color = RGB(255, 255, 255)                  '清理原有颜色
        
        '循环《已打包》工作表所有行
        For n = 4 To ws.Cells(.Rows.count, 6).End(xlUp).ROW
            Set mergedRange = ws.Cells(n, 1).MergeArea
            idRow = idData(Right(ws.Cells(n, 6), 5))                '根据ID号找得到《板件明细》里的行号
            .Cells(idRow, 13) = mergedRange.Cells(1, 1)
            .Cells(idRow, 14) = mergedRange.Cells(1, 4)
            '《板件明细》里设置已打包板件行为灰色显示
            If Val(idRow) > 0 Then .Range("A" & idRow & ":N" & idRow).Interior.Color = RGB(215, 215, 215)
            Set mergedRange = Nothing
        Next n
    
    '==计算已包和待包比值
        '生成的数值为文本，会报感叹号，将这些文本转化为数值
        For n = 6 To .Cells(.Rows.count, 1).End(xlUp).ROW
            .Cells(n, 8).value = .Cells(n, 8).value
            .Cells(n, 9).value = .Cells(n, 9).value
            .Cells(n, 10).value = .Cells(n, 10).value
            .Cells(n, 11).value = .Cells(n, 11).value
        Next n
        Dim packCount As Integer, packExtent As Double
        Dim packCountTotal As Integer, packExtenTotalt As Double
        packCount = Application.WorksheetFunction.CountA(ws.Range("N4" & ":N" & ws.Cells(.Rows.count, "N").End(xlUp).ROW))
        packExtent = Application.WorksheetFunction.Sum(ws.Range("N4" & ":N" & ws.Cells(.Rows.count, "N").End(xlUp).ROW))
        
        packCountTotal = Application.WorksheetFunction.CountA(.Range("K6" & ":K" & .Cells(.Rows.count, "K").End(xlUp).ROW))
        packExtenTotalt = Application.WorksheetFunction.Sum(.Range("K6" & ":K" & .Cells(.Rows.count, "K").End(xlUp).ROW))
        
        .Range("J2") = packCount & "/" & packCountTotal         '呈现已打包的块数比
        .Range("N2") = packExtent / packExtenTotalt             '呈现已打包的面积比值
    End With
'5、<<<<------------------更新《板件明细》工作表


'6、------------------>>>>附属设置
    '记录列表里更新json文件时间
    Dim jsonFile As Object
    Dim fsoJson As Object
    ' 创建 FileSystemObject 对象
    Set fso = CreateObject("Scripting.FileSystemObject")
    Set fsoJson = CreateObject("Scripting.FileSystemObject")
    Set jsonFile = fsoJson.GetFile(folderPath & "\packages.json")                   '创建FileSystemObject对象
    ThisWorkbook.Sheets("记录列表").Cells(nRow, 3) = jsonFile.DateLastModified      '将新的json时间写入列表
    '设置冻结
        'ws.UnfreezePanes
        'ws.Range("A4").Select ' 选择第4行第1列的单元格（A4）
        'ws.Parent.Activate ' 激活工作簿（但不激活具体工作表）
        'ws.FreezePanes = True ' 冻结第3行
    '跳转到指定单元格
'6、<<<<------------------附属设置
    ws.Range("P1").Select

    ' 保存并关闭工作簿
    Set idData = Nothing            '释放《板件明细》里的ID号和行号字典
    wb.Save
    wb.Close
    On Error GoTo 0
    
    Set app = Nothing
    Set wb = Nothing
    Set ws = Nothing
End Sub
