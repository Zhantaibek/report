import java.sql.*;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

/**
 * Oracle JDBC query bridge for Gold Contract report.
 * Usage: java -cp .;classes12.zip OracleGoldQuery <host> <port> <sid> <user> <password> <dateFrom> <dateTo> [ownId]
 * Dates format: YYYY-MM-DD
 * Output: JSON array to stdout, errors to stderr.
 *
 * Returns individual gold deal records (one row per trade) from ARCTS.DEAL,
 * deduplicated by SERIAL, using the ROWNUM date-series trick for Oracle 8i compatibility.
 * Fields: serial, trade_date, quantity, price, value
 */
public class OracleGoldQuery {

    public static void main(String[] args) throws Exception {
        if (args.length < 7) {
            System.err.println("Usage: OracleGoldQuery <host> <port> <sid> <user> <password> <dateFrom> <dateTo> [ownId]");
            System.exit(1);
        }
        String host     = args[0];
        String port     = args[1];
        String sid      = args[2];
        String user     = args[3];
        String password = args[4];
        String dateFrom = args[5];
        String dateTo   = args[6];
        // Значение = ARCTS.DEAL.OWNID (как ID в CURRINSTRUMENT), без сдвига.
        long   ownId    = args.length > 7 ? Long.parseLong(args[7]) : 8853817L;

        LocalDate dFrom = LocalDate.parse(dateFrom);
        LocalDate dTo   = LocalDate.parse(dateTo);
        int dayCount = (int) ChronoUnit.DAYS.between(dFrom, dTo) + 1;

        String url = "jdbc:oracle:thin:@" + host + ":" + port + ":" + sid;
        Class.forName("oracle.jdbc.driver.OracleDriver");

        // Returns individual deduplicated deal rows joined to the date series.
        // Uses the same ROWNUM trick as OracleQuery for Oracle 8i compatibility.
        String sql =
            "SELECT " +
            "  t.SERIAL                             AS serial, " +
            "  TO_CHAR(dates.dt, 'YYYY-MM-DD')     AS trade_date, " +
            "  t.VOLUME                             AS quantity, " +
            "  CASE WHEN t.VOLUME > 0 THEN t.VOLCONTR / t.VOLUME ELSE 0 END AS price, " +
            "  t.VOLCONTR                           AS value " +
            "FROM " +
            "  (SELECT TO_DATE(?, 'YYYY-MM-DD') + ROWNUM - 1 AS dt " +
            "   FROM ARCTS.DEAL " +
            "   WHERE ROWNUM <= " + dayCount + ") dates, " +
            "  (SELECT t.SERIAL, t.VOLUME, t.VOLCONTR, t.DATE0 " +
            "   FROM ( " +
            "     SELECT t.*, ROW_NUMBER() OVER (PARTITION BY t.SERIAL ORDER BY t.DATE0 DESC) AS rn " +
            "     FROM ARCTS.DEAL t " +
            "     WHERE t.DATE0 BETWEEN makelongdate(TO_DATE(?, 'YYYY-MM-DD')) " +
            "                       AND makelongdate(TO_DATE(?, 'YYYY-MM-DD')) " +
            "       AND t.OWNID = " + ownId +
            "   ) t " +
            "   WHERE t.rn = 1) t " +
            "WHERE t.DATE0 >= makelongdate(dates.dt) " +
            "  AND t.DATE0 <  makelongdate(dates.dt + 1) " +
            "ORDER BY t.SERIAL";

        try (Connection conn = DriverManager.getConnection(url, user, password);
             PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setString(1, dateFrom);
            ps.setString(2, dateFrom);
            ps.setString(3, dateTo);

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
