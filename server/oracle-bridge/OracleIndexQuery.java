import java.sql.*;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

/**
 * Oracle JDBC query bridge for Exchange Index report (Форма 10).
 * Usage: java -cp .;classes12.zip OracleIndexQuery <host> <port> <sid> <user> <password> <dateFrom> <dateTo>
 * Dates format: YYYY-MM-DD
 * Output: JSON array to stdout, errors to stderr.
 *
 * Returns: index_date (YYYY-MM-DD), index_value (points)
 */
public class OracleIndexQuery {

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

        LocalDate dFrom = LocalDate.parse(dateFrom);
        LocalDate dTo   = LocalDate.parse(dateTo);
        int dayCount = (int) ChronoUnit.DAYS.between(dFrom, dTo) + 1;

        String url = "jdbc:oracle:thin:@" + host + ":" + port + ":" + sid;
        Class.forName("oracle.jdbc.driver.OracleDriver");

        String sql =
            "SELECT " +
            "  TO_CHAR(dates.dt, 'YYYY-MM-DD') AS index_date, " +
            "  e.INDEXVALUE                      AS index_value " +
            "FROM " +
            "  (SELECT TO_DATE(?, 'YYYY-MM-DD') + ROWNUM - 1 AS dt " +
            "   FROM ARCTS.DEAL " +
            "   WHERE ROWNUM <= " + dayCount + ") dates " +
            "INNER JOIN ARCTS.EXINDEX e " +
            "  ON e.CALCDATE >= makelongdate(dates.dt) " +
            " AND e.CALCDATE <  makelongdate(dates.dt + 1) " +
            "ORDER BY dates.dt";

        try (Connection conn = DriverManager.getConnection(url, user, password);
             PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setString(1, dateFrom);

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
                    String col = meta.getColumnName(i).toLowerCase();
                    Object val = rs.getObject(i);
                    sb.append("\"").append(col).append("\":");
                    if (val == null) {
                        sb.append("null");
                    } else if (val instanceof Number) {
                        sb.append(val.toString());
                    } else {
                        String s = val.toString()
                            .replace("\\", "\\\\")
                            .replace("\"", "\\\"")
                            .replace("\n", "\\n")
                            .replace("\r", "\\r");
                        sb.append("\"").append(s).append("\"");
                    }
                }
                sb.append("}");
            }
            sb.append("]");
            System.out.println(sb.toString());
        }
    }
}
