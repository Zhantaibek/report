import java.sql.*;
import java.nio.charset.StandardCharsets;

/**
 * Oracle JDBC query bridge for Exchange Index report (Форма 10).
 * Usage: java -cp .;classes12.zip OracleIndexQuery <host> <port> <sid> <user> <password> <dateFrom> <dateTo>
 * Dates format: YYYY-MM-DD
 * Output: JSON array to stdout, errors to stderr.
 *
 * Returns: index_date (YYYY-MM-DD), index_value (points)
 * % change vs previous trading day is computed client-side.
 *
 * TODO: replace ARCTS.EXINDEX / CALCDATE / INDEXVALUE with the actual table/column names.
 */
public class OracleIndexQuery {

    static String stringFromOracleBytes(ResultSet rs, int colIdx) throws SQLException {
        byte[] bytes = rs.getBytes(colIdx);
        if (bytes == null) return null;
        String utf8 = new String(bytes, StandardCharsets.UTF_8).trim();
        if (!utf8.contains("\uFFFD")) return utf8;
        try { return new String(bytes, "Cp1251").trim(); } catch (Exception e) { return utf8; }
    }

    static String jsonEscape(String s) {
        return s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "\\r");
    }

    public static void main(String[] args) throws Exception {
        if (args.length < 7) {
            System.err.println("Usage: OracleIndexQuery <host> <port> <sid> <user> <password> <dateFrom> <dateTo>");
            System.exit(1);
        }
        String host     = args[0];
        String port     = args[1];
        String sid      = args[2];
        String user     = args[3];
        String password = args[4];
        String dateFrom = args[5];
        String dateTo   = args[6];

        String url = "jdbc:oracle:thin:@" + host + ":" + port + ":" + sid;
        Class.forName("oracle.jdbc.driver.OracleDriver");

        // Discover tables/views whose names contain INDEX in accessible schemas
        String sql =
            "SELECT OWNER, OBJECT_NAME, OBJECT_TYPE " +
            "FROM ALL_OBJECTS " +
            "WHERE UPPER(OBJECT_NAME) LIKE '%INDEX%' " +
            "  AND OBJECT_TYPE IN ('TABLE', 'VIEW') " +
            "ORDER BY OWNER, OBJECT_NAME";

        try (Connection conn = DriverManager.getConnection(url, user, password);
             PreparedStatement ps = conn.prepareStatement(sql)) {

            ResultSet rs = ps.executeQuery();

            ResultSetMetaData meta = rs.getMetaData();
            int cols = meta.getColumnCount();
            StringBuilder sb = new StringBuilder("[");
            boolean first = true;
            while (rs.next()) {
                if (!first) sb.append(",");
                first = false;
                sb.append("{");
                for (int i = 1; i <= cols; i++) {
                    if (i > 1) sb.append(",");
                    String col = meta.getColumnLabel(i).toLowerCase();
                    sb.append("\"").append(col).append("\":");
                    String s = stringFromOracleBytes(rs, i);
                    sb.append(s != null ? "\"" + jsonEscape(s) + "\"" : "null");
                }
                sb.append("}");
            }
            sb.append("]");
            System.out.write(sb.toString().getBytes(StandardCharsets.UTF_8));
            System.out.println();
        }
    }
}
