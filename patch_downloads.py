import sys

file_path = "www/admin.js"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

helper = """
async function downloadFileCapacitor(filename, dataBase64, mimeType) {
    if (window.Capacitor && window.Capacitor.isNativePlatform()) {
        try {
            const { Filesystem, Directory } = window.Capacitor.Plugins;
            if (!Filesystem) {
                alert("Please install @capacitor/filesystem plugin to enable downloads on Android.");
                return false;
            }
            await Filesystem.writeFile({
                path: filename,
                data: dataBase64,
                directory: Directory.Documents
            });
            alert("File saved to Documents folder: " + filename);
            return true;
        } catch (e) {
            alert("Download failed: " + e.message);
            return false;
        }
    }
    return false;
}
"""

if "downloadFileCapacitor" not in content:
    content = helper + "\n" + content

content = content.replace(
"""function downloadTemplate() {
    const content = "Employee_Name,Employee_Gender,Role,Contact_Number,Father_Name,PAN_Card_Number,Aadhar_Number,Date_of_Birth,Bank_Account_Number,Joining_Date,Custom_1,Custom_2,Custom_3\\nJohn Doe,M,Driver,1234567890,Richard Doe,ABCDE1234F,123456789012,1990-01-01,123456789,2023-01-01,,,";
    const blob = new Blob([content], { type: 'text/csv' });""",
"""async function downloadTemplate() {
    const content = "Employee_Name,Employee_Gender,Role,Contact_Number,Father_Name,PAN_Card_Number,Aadhar_Number,Date_of_Birth,Bank_Account_Number,Joining_Date,Custom_1,Custom_2,Custom_3\\nJohn Doe,M,Driver,1234567890,Richard Doe,ABCDE1234F,123456789012,1990-01-01,123456789,2023-01-01,,,";
    
    if (window.Capacitor && window.Capacitor.isNativePlatform()) {
        const base64 = btoa(content);
        await downloadFileCapacitor("Ray_Template.csv", base64, "text/csv");
        return;
    }
    
    const blob = new Blob([content], { type: 'text/csv' });""")

content = content.replace(
"""        if (format === 'csv') {
            XLSX.writeFile(wb, "attendance_history.csv", { bookType: "csv" });
        } else {
            XLSX.writeFile(wb, "attendance_history.xlsx");
        }""",
"""        if (format === 'csv') {
            if (window.Capacitor && window.Capacitor.isNativePlatform()) {
                const b64 = XLSX.write(wb, { bookType: "csv", type: "base64" });
                downloadFileCapacitor("attendance_history.csv", b64, "text/csv");
            } else {
                XLSX.writeFile(wb, "attendance_history.csv", { bookType: "csv" });
            }
        } else {
            if (window.Capacitor && window.Capacitor.isNativePlatform()) {
                const b64 = XLSX.write(wb, { bookType: "xlsx", type: "base64" });
                downloadFileCapacitor("attendance_history.xlsx", b64, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
            } else {
                XLSX.writeFile(wb, "attendance_history.xlsx");
            }
        }""")

content = content.replace(
"""        doc.save("Attendance_Sheet_YLA.pdf");""",
"""        if (window.Capacitor && window.Capacitor.isNativePlatform()) {
            const b64 = doc.output('datauristring').split(',')[1];
            downloadFileCapacitor("Attendance_Sheet_YLA.pdf", b64, "application/pdf");
        } else {
            doc.save("Attendance_Sheet_YLA.pdf");
        }""")

content = content.replace(
"""        doc.save("Attendance_Summary_YLA.pdf");""",
"""        if (window.Capacitor && window.Capacitor.isNativePlatform()) {
            const b64 = doc.output('datauristring').split(',')[1];
            downloadFileCapacitor("Attendance_Summary_YLA.pdf", b64, "application/pdf");
        } else {
            doc.save("Attendance_Summary_YLA.pdf");
        }""")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Patch applied")
