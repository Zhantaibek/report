import java.sql.*;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

/**
 * Oracle JDBC query bridge for USD report.
 * Usage: java -cp .;classes12.zip OracleQuery <host> <port> <sid> <user> <password> <dateFrom> <dateTo> [ownId]
 * Dates format: YYYY-MM-DD
 * Output: JSON array to stdout, errors to stderr.
 *
 * Query logic:
 *  - Уникальные сделки (по SERIAL) из ARCTS.DEAL и TS.DEAL
 *  - Filtered by OWNID and date range using makelongdate()
 *  - Groups by calendar date using ROWNUM trick for Oracle 8i
 *  - Returns: trade_date, deal_count, sec_count, volume_usd (=VOLCONTR)
 */
public class OracleQuery {

    public static void main(String[] args) throws Exception {
        if (args.length < 7) {
            System.err.println("Usage: OracleQuery <host> <port> <sid> <user> <password> <dateFrom> <dateTo> [ownId]");
            System.exit(1);
        }
        String host     = args[0];
        String port     = args[1];
        String sid      = args[2];
        String user     = args[3];
        String password = args[4];
        String dateFrom = args[5];
        String dateTo   = args[6];
        // Параметр с API = ID из CURRINSTRUMENT; в ARCTS.DEAL / TS.DEAL фильтр OWNID = значение + 1.
        long   ownIdArg = args.length > 7 ? Long.parseLong(args[7]) : 8853816L;
        long   ownId    = ownIdArg + 1;

        // Number of calendar days in range (used for ROWNUM-based date series)
        LocalDate dFrom = LocalDate.parse(dateFrom);
        LocalDate dTo   = LocalDate.parse(dateTo);
        int dayCount = (int) ChronoUnit.DAYS.between(dFrom, dTo) + 1;

        String url = "jdbc:oracle:thin:@" + host + ":" + port + ":" + sid;
        Class.forName("oracle.jdbc.driver.OracleDriver");

        // Use ROWNUM from ARCTS.DEAL as row-generator (Oracle 8i has no CONNECT BY LEVEL)
        // makelongdate(dt)   = start of day dt in Oracle's internal long format
        // makelongdate(dt+1) = start of next day
        // Trades on day dt have: DATE0 >= makelongdate(dt) AND DATE0 < makelongdate(dt+1)
        String sql =
            "SELECT " +
            "  TO_CHAR(dates.dt, 'YYYY-MM-DD')   AS trade_date, " +
            "  COUNT(DISTINCT t.SERIAL)           AS deal_count, " +
            "  SUM(t.VOLUME)                      AS sec_count, " +
            "  SUM(t.VOLCONTR)                    AS volume_usd " +
            "FROM " +
            "  (SELECT TO_DATE(?, 'YYYY-MM-DD') + ROWNUM - 1 AS dt " +
            "   FROM ARCTS.DEAL " +
            "   WHERE ROWNUM <= " + dayCount + ") dates, " +
            "  (SELECT x.SERIAL, x.VOLUME, x.VOLCONTR, x.DATE0 " +
            "   FROM ( " +
            "     SELECT u.*, ROW_NUMBER() OVER (PARTITION BY u.SERIAL ORDER BY u.DATE0 DESC) AS rn " +
            "     FROM ( " +
            "       SELECT t.SERIAL, t.VOLUME, t.VOLCONTR, t.DATE0 " +
            "       FROM ARCTS.DEAL t " +
            "       WHERE t.DATE0 BETWEEN makelongdate(TO_DATE(?, 'YYYY-MM-DD')) " +
            "                         AND makelongdate(TO_DATE(?, 'YYYY-MM-DD')) " +
            "         AND t.OWNID = " + ownId +
            "       UNION ALL " +
            "       SELECT t.SERIAL, t.VOLUME, t.VOLCONTR, t.DATE0 " +
            "       FROM TS.DEAL t " +
            "       WHERE t.DATE0 BETWEEN makelongdate(TO_DATE(?, 'YYYY-MM-DD')) " +
            "                         AND makelongdate(TO_DATE(?, 'YYYY-MM-DD')) " +
            "         AND t.OWNID = " + ownId +
            "     ) u " +
            "   ) x " +
            "   WHERE x.rn = 1) t " +
            "WHERE t.DATE0 >= makelongdate(dates.dt) " +
            "  AND t.DATE0 <  makelongdate(dates.dt + 1) " +
            "GROUP BY dates.dt " +
            "HAVING COUNT(t.SERIAL) > 0 " +
            "ORDER BY dates.dt";

        // TODO(временно): убрать после отладки загрузки сделок
        System.err.println("[OracleQuery DEBUG] dateFrom=" + dateFrom + " dateTo=" + dateTo + " ownIdArg=" + ownIdArg + " ownIdInSql=" + ownId + " dayCount=" + dayCount);
        System.err.println("[OracleQuery DEBUG] SQL (? : 1=series, 2-3=ARCTS BETWEEN, 4-5=TS BETWEEN):\n" + sql);

        try (Connection conn = DriverManager.getConnection(url, user, password);
             PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setString(1, dateFrom);  // date series start
            ps.setString(2, dateFrom);  // BETWEEN ARCTS
            ps.setString(3, dateTo);
            ps.setString(4, dateFrom);  // BETWEEN TS
            ps.setString(5, dateTo);

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
