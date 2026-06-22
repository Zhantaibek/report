import java.sql.*;
import java.sql.Types;

/**
 * ВРЕМЕННО — удалить вместе с /api/instruments и queryOracleCurrInstrumentsAll().
 * Returns all columns from ts.CURRINSTRUMENT as JSON.
 * Usage: java -cp .;classes12.zip OracleCurrInstrumentsAll <host> <port> <sid> <user> <password>
 */
public class OracleCurrInstrumentsAll {

    static String jsonEscape(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\r", " ").replace("\n", " ");
    }

    static String readString(ResultSet rs, int colIndex) throws Exception {
        byte[] bytes = rs.getBytes(colIndex);
        if (bytes == null) return null;
        return new String(bytes, "UTF-8").trim();
    }

    static void appendJsonValue(StringBuilder sb, ResultSet rs, int colIndex, int sqlType) throws Exception {
        Object obj = rs.getObject(colIndex);
        if (obj == null || rs.wasNull()) {
            sb.append("null");
            return;
        }

        switch (sqlType) {
            case Types.NUMERIC:
            case Types.DECIMAL:
            case Types.INTEGER:
            case Types.BIGINT:
            case Types.SMALLINT:
            case Types.TINYINT:
            case Types.FLOAT:
            case Types.DOUBLE:
            case Types.REAL:
                sb.append(obj.toString());
                break;
            case Types.DATE:
            case Types.TIMESTAMP:
            case Types.TIME:
                sb.append("\"").append(jsonEscape(String.valueOf(obj))).append("\"");
                break;
            default: {
                String s = readString(rs, colIndex);
                if (s == null) {
                    sb.append("null");
                } else {
                    sb.append("\"").append(jsonEscape(s)).append("\"");
                }
            }
        }
    }

    public static void main(String[] args) throws Exception {
        if (args.length < 5) {
            System.err.println("Usage: OracleCurrInstrumentsAll <host> <port> <sid> <user> <password>");
            System.exit(1);
        }
        String host     = args[0];
        String port     = args[1];
        String sid      = args[2];
        String user     = args[3];
        String password = args[4];

        String url = "jdbc:oracle:thin:@" + host + ":" + port + ":" + sid;
        Class.forName("oracle.jdbc.driver.OracleDriver");

        String sql = "SELECT t.namerus, t.nameeng, shortname, extcode, nominal, cupontax, paycnt, ts.makedate(opendate), ts.makedate(xdate), ts.makedate(pastpaydate) FROM TS.CURRINSTRUMENT t";

        try (Connection conn = DriverManager.getConnection(url, user, password);
             PreparedStatement ps = conn.prepareStatement(sql);
             ResultSet rs = ps.executeQuery()) {

            ResultSetMetaData meta = rs.getMetaData();
            int colCount = meta.getColumnCount();
            String[] colNames = new String[colCount];
            int[] colTypes = new int[colCount];
            for (int i = 1; i <= colCount; i++) {
                colNames[i - 1] = meta.getColumnLabel(i).toLowerCase();
                colTypes[i - 1] = meta.getColumnType(i);
            }

            StringBuilder sb = new StringBuilder("[");
            boolean firstRow = true;
            while (rs.next()) {
                if (!firstRow) sb.append(",");
                firstRow = false;
                sb.append("{");
                for (int i = 0; i < colCount; i++) {
                    if (i > 0) sb.append(",");
                    sb.append("\"").append(colNames[i]).append("\":");
                    appendJsonValue(sb, rs, i + 1, colTypes[i]);
                }
                sb.append("}");
            }
            sb.append("]");
            System.out.write(sb.toString().getBytes("UTF-8"));
            System.out.println();
        }
    }
}
