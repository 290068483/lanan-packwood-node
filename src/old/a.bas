    Private filePath$       '指定名称（设备文件）的路径

'===============目标路径新建同名文件夹================
Function 新建打包文件(na As String) As String
    Dim fso As Object
    Dim folderPath As String
    Dim filesPath As String
    Dim srcFilesPath As String
    
    folderPath = ThisWorkbook.Sheets("配置").Cells(3, 3) & _
                 "\" & Format(Date, "yymmdd") & " " & na & "·"          '指定文件夹路径和名称
    '(由于MPM会第一次引入时会自动修改文件名最后个字符为“_”,所在此处提前附加一个字符)
    
    filesPath = folderPath & "\" & "files"                              '指定files文件夹路径和名称
    srcFilesPath = folderPath & "\" & "srcFiles"                        '指定srcFiles文件夹路径和名称
    
    ' 创建 FileSystemObject 对象
    Set fso = CreateObject("Scripting.FileSystemObject")
    
    ' 检查文件夹是否已存在
    If Not fso.FolderExists(folderPath) Then
        fso.CreateFolder folderPath                 '创建文件夹
        fso.CreateFolder filesPath                  '创建文件夹
        fso.CreateFolder srcFilesPath               '创建文件夹
    End If
    
    新建打包文件 = Mid(folderPath, InStrRev(folderPath, "\") + 1)
    
    ' 释放对象
    Set fso = Nothing
End Function

'===============生成xml文件和打包记录================
Sub 复制xml文件(ByVal na As String)
    Dim startFolder As String, folderNameToFind As String
    Dim folderCount%
    Dim destinationPath$, newFileName$
    Dim xmlPath$, jsonPath$
    Dim srcName$, opName$
    
    '原始文件名
    Dim naLen%
    naLen = Len(Format(Date, "yymmdd")) + 2
    
    opName = Left(na, InStrRev(na, "·") - 1)        '获取增加了日期的文件名
    srcName = Mid(opName, naLen)                    '获取原始文件名
    
    ' 指定的识别文件名
    folderNameToFind = ThisWorkbook.Sheets("配置").Cells(4, 3)
    
    ' 获取源文件路径
    startFolder = ThisWorkbook.Sheets("配置").Cells(1, 3) & "\" & srcName
    
    ' 获取源json文件路径
    jsonPath = ThisWorkbook.Path & "\" & "packages.json"
           
    ' 目标文件夹路径
    destinationPath = ThisWorkbook.Sheets("配置").Cells(3, 3) & "\" & na & "\srcFiles\"
                   
    ' 初始化计数器
    folderCount = 0
    filePath = ""
    
    ' 调用递归函数查找="设备文件"的文件夹
    Dim zdFiles%
    zdFiles = 查找指定文件路径(startFolder, folderNameToFind, folderCount)      ' 得到"设备文件"的文件夹的数量
    
    '======获取各产线里的xml文件
    Dim fso As Object
    Dim folder As Object
    Dim subFolder As Object
  
    ' 创建 FileSystemObject 对象
    Set fso = CreateObject("Scripting.FileSystemObject")
    Set folder = fso.GetFolder(filePath)
                
    ' 遍历所有直接子文件夹,得到各产线的xml文件并生成数组
    Dim xmlArr() As String          ' 声明动态数组
    Dim n%                          ' 计算产线数量
    For Each subFolder In folder.SubFolders
        If subFolder.Name Like "*" & "产线" & "*" Then      '获取各产线文件夹
            n = n + 1
            ReDim Preserve xmlArr(1 To n)
            xmlArr(n) = filePath & "\" & subFolder.Name & "\0、排版文件\优化文件.xml"
        End If
    Next subFolder
            
    Dim hFso As Object
    Dim file As Object
  
    ' 创建 FileSystemObject 对象
    Set hFso = CreateObject("Scripting.FileSystemObject")

    ' mpm里local文件夹路径里创建新文件并写入文本
    Dim xmlFilePath As String
    
    xmlFilePath = destinationPath & opName & ".xml"             ' mpm里local文件夹里的XML文件路径
    Call 合并xml文件(xmlArr(), xmlFilePath)

    ' 给数组赋值要删除的标签名称
    Dim tagName(0 To 2) As String
    tagName(0) = "Metals"
    tagName(1) = "Hardwares"
    tagName(2) = "Part"
          
    Call 删除五金标签(tagName, xmlFilePath)
    '复制json模板
    FileCopy jsonPath, ThisWorkbook.Sheets("配置").Cells(3, 3) & "\" & na & "\packages.json"
    '复制板件明细，生成打包记录
    Dim panelTable$, table As Object, tables As Object
    ' 创建 FileSystemObject 对象
    panelTable = filePath & ThisWorkbook.Sheets("配置").Cells(6, 3)
    Set tables = CreateObject("Scripting.FileSystemObject").GetFolder(panelTable)
    
    '======循环当前客户文件夹，在报表里找到“板件明细”文件并复制到local文件夹里，生成《打包记录》文件
    For Each table In tables.Files
        If InStr(table.Name, "板件明细") > 0 Then
            panelTable = panelTable & "\" & table.Name
            On Error Resume Next
            Dim targetPath$
            targetPath = ThisWorkbook.Sheets("配置").Cells(3, 3) & "\" & na & "\打包记录.xlsx"
            FileCopy panelTable, targetPath
            
            ' 在后台打开工作簿
            Dim wb As Workbook
            Dim ws As Worksheet
            Set wb = Workbooks.Open(fileName:=targetPath, ReadOnly:=False, UpdateLinks:=0, AddToMru:=False)
            Application.ScreenUpdating = False                      ' 隐藏 Excel 应用程序窗口
            
            '----------删除多余的列
            For n = 18 To 12 Step -1
                Set ws = wb.Sheets("Page1").Columns(n).Delete       '删除指定列
            Next n

            wb.Sheets("Page1").Name = "板件明细"                    '修改工作表名称
            Set ws = wb.Sheets("板件明细")
            
            ws.Columns(13).Copy Destination:=ws.Columns(14)         '最后一行向右复制一列
            
            '----------修改部分文字
            ws.Cells(4, 13) = "包号"
            ws.Range("M4:N4").Font.Size = 10
            ws.Range("H2") = "块数完成度："
            ws.Range("L2") = "面积完成度："
            ws.Range("K2") = 0
            ws.Range("N2") = 0                          '最终的N行是由前面的M行复制的
            
            '----------设置单元格式
            ws.Cells(1, 1).Font.Size = 16
            ws.Rows(2).UnMerge
            ws.Range("H2:I2").Merge
            ws.Range("J2:K2").Merge
            ws.Range("L2:M2").Merge
            
            With ws.Range("H2,L2")
                .Font.Size = 10
                .Font.Bold = True
                .Font.Name = "黑体"
                .VerticalAlignment = xlCenter           ' 垂直居中对齐
                .HorizontalAlignment = xlRight          ' 水平靠右
            End With
            With ws.Range("J2,N2")
                .Font.Size = 12
                .Font.Bold = True
                .Font.Name = "黑体"
                .VerticalAlignment = xlCenter           ' 垂直居中对齐
                .HorizontalAlignment = xlLeft           ' 水平靠中
                .Font.Color = RGB(255, 0, 0)
            End With
            
            ws.Range("N4") = "打包时间"
            ws.Range("A1:N1").Merge
            ws.Range("N6:N" & ws.Cells(ws.Rows.count, "N").End(xlUp).ROW).NumberFormat = "yy/mm/dd hh:mm:ss"
            ws.Range("N2").NumberFormat = "0.00%"
            ws.Range("A1").Font.Color = RGB(0, 0, 160)
            
            '对单元格排序
            With ws.Sort
                .SortFields.Clear
                .SortFields.Add key:=ws.Range("B6"), Order:=xlAscending                         '升序排列
                .SetRange ws.Range("A6:AA" & ws.Cells(ws.Rows.count, "B").End(xlUp).ROW)        '指定排序范围
                .Header = xlNo                                                                  '没有标题行
                .Apply
            End With
    
            '----------循环各列宽
            Dim columnWidths As Variant
            columnWidths = Array(4, 6, 7, 20, 14, 14, 6, 8, 8, 5, 7, 25, 5, 20)
            For n = LBound(columnWidths) To UBound(columnWidths)
                wb.Sheets(1).Columns(n + 1).columnWidth = columnWidths(n)
            Next n
            
            '----------收尾设置
            ws.Range("O1").Select
            wb.Close SaveChanges:=True                              ' 保存更改并关闭工作簿
            Application.ScreenUpdating = True                       ' 恢复屏幕更新
            
            ' 释放对象变量
            Set wb = Nothing
            Set ws = Nothing
            Exit For
        End If
    Next table

    Set fso = Nothing
    Set folder = Nothing
    Set subFolder = Nothing
    Set hFso = Nothing
    Set file = Nothing
End Sub

'查找《设备文件》文件夹路径
Function 查找指定文件路径(ByVal currentFolder$, ByVal folderNameToFind$, ByRef folderCount%) As Integer
    Dim fso As Object
    Dim folder As Object
    Dim subFolder As Object

    '创建文件系统对象
    Set fso = CreateObject("Scripting.FileSystemObject")
    
    '获取当前文件夹对象
    Set folder = fso.GetFolder(currentFolder)
    
    '遍历当前文件夹的子文件夹
    For Each subFolder In folder.SubFolders
        On Error Resume Next
        '如果子文件夹名称匹配，增加计数器
        If subFolder.Name = folderNameToFind Then
            folderCount = folderCount + 1
            filePath = subFolder.Path
            GoTo 100
        End If
        
        '递归调用，继续查找子文件夹
        Call 查找指定文件路径(subFolder.Path, folderNameToFind, folderCount)
100:
    Next subFolder
    查找指定文件路径 = folderCount
End Function

'===============处理xml文件——合并各产线的xml数据================
Sub 合并xml文件(xmlPath() As String, ByVal resultXml As String)

    Dim mergedDoc As Object
    Dim mergedRoot As Object
    
    ' 创建合并后的XML文档
    Set mergedDoc = CreateObject("MSXML2.DOMDocument")
    mergedDoc.appendChild mergedDoc.createProcessingInstruction("xml", "version='1.0' encoding='utf-8'")
    
    Set mergedRoot = mergedDoc.createElement("Root")
    mergedDoc.appendChild mergedRoot
    
    For n = LBound(xmlPath) To UBound(xmlPath)
        Dim xmlDoc As Object
        Dim rootN As Object
        Dim node As Object

        ' 创建XML DOM对象
        Set xmlDoc = CreateObject("MSXML2.DOMDocument")

        ' 加载XML文件
        If Not xmlDoc.Load(xmlPath(n)) Then
            MsgBox "无法加载xml文件"
            Exit Sub
        End If
        
        ' 获取两个XML文件的根元素
        Set rootN = xmlDoc.DocumentElement
        
        ' 将XML文件的子节点添加到合并后的文档
        For Each node In rootN.ChildNodes
            mergedRoot.appendChild node.CloneNode(True)
        Next node
        
        ' 释放对象
        Set xmlDoc = Nothing
        Set rootN = Nothing
        Set node = Nothing
    Next n
    
    ' 保存合并后的XML文件
    mergedDoc.Save resultXml
    
    ' 释放对象
    Set mergedDoc = Nothing
    Set mergedRoot = Nothing
End Sub

'===============删除xml文件里的五金标签和包含“【】”符号且有“·”字符的标签================
Sub 删除五金标签(tagName() As String, xmlFilePath As String)
    Dim xmlDoc As Object
    Dim xmlNode As Object
    Dim nodesToDelete As Object
    Dim i As Integer
    
    ' 创建XML文档对象
    Set xmlDoc = CreateObject("MSXML2.DOMDocument")
    
    ' 加载XML文件，删除所有五金标签
    If xmlDoc.Load(xmlFilePath) Then
        For n = LBound(tagName) To UBound(tagName)
            ' 选择所有指定名称的标签
            Set nodesToDelete = xmlDoc.getElementsByTagName(tagName(n))
            
            ' 遍历并删除这些标签
            For i = nodesToDelete.length - 1 To 0 Step -1
                Set xmlNode = nodesToDelete.Item(i)
                xmlNode.ParentNode.RemoveChild xmlNode
            Next i
        Next n
        
        '======删除有前台和后台备注里含有【】，且【】里有·的标签
        Dim nodeList As Object
        Dim ProduceNumber$, CraftMarkText$, panelText$

        ' 获取所有 <Panel> 标签
        Set nodeList = xmlDoc.getElementsByTagName("Panel")
        
        ' 从后向前遍历节点（避免删除时影响索引）
        For i = nodeList.length - 1 To 0 Step -1
            Set xmlNode = nodeList.Item(i)
            
            ' 检查 CraftMark 属性是否存在
            If Not xmlNode.Attributes.getNamedItem("CraftMark") Is Nothing And _
               Not xmlNode.Attributes.getNamedItem("ProduceNumber") Is Nothing Then
                
                '前台备注有文本读取前台备注，前台备注为空则读取后台备注
                ProduceNumber = xmlNode.Attributes.getNamedItem("ProduceNumber").text
                CraftMarkText = xmlNode.Attributes.getNamedItem("CraftMark").text
                If ProduceNumber <> "" Then panelText = ProduceNumber Else panelText = CraftMarkText
                
                ' 检查 CraftMark 值是否符合条件
                If InStr(panelText, "】") > 0 Then
                    If InStr(Left(panelText, InStr(panelText, "】") - 1), "·") > 0 Then
                        xmlNode.ParentNode.RemoveChild xmlNode        ' 删除符合条件的 <Panel> 标签
                    End If
                End If
            End If
        Next i
        
        ' 保存修改后的XML文件
        xmlDoc.Save xmlFilePath
    End If
    
    ' 释放对象
    Set xmlDoc = Nothing
    Set xmlNode = Nothing
    Set nodesToDelete = Nothing
End Sub




