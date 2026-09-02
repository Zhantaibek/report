import java.sql.*;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.nio.charset.StandardCharsets;

/**
 * Oracle JDBC: сделки для Формы 2 (USD).
 * Те же источники, что OracleQuery (ARCTS.DEAL + TS.DEAL), но строки сделок,
 * а не агрегация по дате — для группировки Класс → ЦБ как в Форме 2.
 *
 * Usage: java -cp .;classes12.zip OracleForm2Query &lt;host&gt; &lt;port&gt; &lt;sid&gt; &lt;user&gt; &lt;password&gt; &lt;dateFrom&gt; &lt;dateTo&gt; [ownId]
 */
public class OracleForm2Query {

    static String stringFromOracleBytes(ResultSet rs, int colIdx) throws SQLException {
        byte[] bytes = rs.getBytes(colIdx);
        if (bytes == null) return null;
        String utf8 = new String(bytes, StandardCharsets.UTF_8).trim();
        if (!utf8.contains("\uFFFD")) {
            return utf8;
        }
        try {
            return new String(bytes, "Cp1251").trim();
        } catch (Exception e) {
            return utf8;
        }
    }

    static String jsonEscape(String s) {
        return s.replace("\\", "\\\\")
            .replace("\"", "\\\"")
            .replace("\n", "\\n")
            .replace("\r", "\\r");
    }

    public static void main(String[] args) throws Exception {
        if (args.length < 7) {
            System.err.println("Usage: OracleForm2Query <host> <port> <sid> <user> <password> <dateFrom> <dateTo> [ownId]");
            System.exit(1);
        }
        String host     = args[0];
        String port     = args[1];
        String sid      = args[2];
        String user     = args[3];
        String password = args[4];
        String dateFrom = args[5];
        String dateTo   = args[6];
        boolean hasOwnId = args.length > 7 && args[7] != null && args[7].trim().length() > 0;
        long ownId = 0L;
        if (hasOwnId) {
            ownId = Long.parseLong(args[7]) + 1;
        }
        String ownFilter = hasOwnId ? " AND t.OWNID = " + ownId : "";

        LocalDate dFrom = LocalDate.parse(dateFrom);
        LocalDate dTo   = LocalDate.parse(dateTo);
        int dayCount = (int) ChronoUnit.DAYS.between(dFrom, dTo) + 1;

        String url = "jdbc:oracle:thin:@" + host + ":" + port + ":" + sid;
        Class.forName("oracle.jdbc.driver.OracleDriver");

        String sql =
            "SELECT " +
            "  t.SERIAL                             AS serial, " +
            "  TO_CHAR(dates.dt, 'YYYY-MM-DD')     AS trade_date, " +
            "  t.VOLUME                             AS quantity, " +
            "  CASE WHEN t.VOLUME > 0 THEN t.VOLCONTR / t.VOLUME ELSE 100 END AS price, " +
            "  t.VOLCONTR                           AS value, " +
            "  t.OWNID                              AS ownid, " +
            "  ci.NAMERUS                           AS issuer_namerus, " +
            "  ci.EXTCODE                           AS sec_extcode " +
            "FROM " +
            "  (SELECT TO_DATE(?, 'YYYY-MM-DD') + ROWNUM - 1 AS dt " +
            "   FROM ARCTS.DEAL " +
            "   WHERE ROWNUM <= " + dayCount + ") dates, " +
            "  (SELECT x.SERIAL, x.VOLUME, x.VOLCONTR, x.DATE0, x.OWNID " +
            "   FROM ( " +
            "     SELECT u.*, ROW_NUMBER() OVER (PARTITION BY u.SERIAL ORDER BY u.DATE0 DESC) AS rn " +
            "     FROM ( " +
            "       SELECT t.SERIAL, t.VOLUME, t.VOLCONTR, t.DATE0, t.OWNID " +
            "       FROM ARCTS.DEAL t " +
            "       WHERE t.DATE0 BETWEEN makelongdate(TO_DATE(?, 'YYYY-MM-DD')) " +
            "                         AND makelongdate(TO_DATE(?, 'YYYY-MM-DD')) " +
            ownFilter +
            "       UNION ALL " +
            "       SELECT t.SERIAL, t.VOLUME, t.VOLCONTR, t.DATE0, t.OWNID " +
            "       FROM TS.DEAL t " +
            "       WHERE t.DATE0 BETWEEN makelongdate(TO_DATE(?, 'YYYY-MM-DD')) " +
            "                         AND makelongdate(TO_DATE(?, 'YYYY-MM-DD')) " +
            ownFilter +
            "     ) u " +
            "   ) x " +
            "   WHERE x.rn = 1) t, " +
            "  TS.TS_CURRINSTRUMENT_ARCTS ci " +
            "WHERE t.DATE0 >= makelongdate(dates.dt) " +
            "  AND t.DATE0 <  makelongdate(dates.dt + 1) " +
            "  AND ci.DEALS_ID(+) = t.OWNID " +
            "ORDER BY dates.dt, t.SERIAL";

        try (Connection conn = DriverManager.getConnection(url, user, password);
             PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setString(1, dateFrom);
            ps.setString(2, dateFrom);
            ps.setString(3, dateTo);
            ps.setString(4, dateFrom);
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
                    String col = meta.getColumnLabel(i).toLowerCase();
                    sb.append("\"").append(col).append("\":");
                    if (col.equals("serial") || col.equals("quantity") || col.equals("price")
                            || col.equals("value") || col.equals("ownid")) {
                        Object val = rs.getObject(i);
                        if (val == null) {
                            sb.append("null");
                        } else if (val instanceof Number) {
                            sb.append(val.toString());
                        } else {
                            sb.append(val.toString());
                        }
                    } else {
                        String s = stringFromOracleBytes(rs, i);
                        if (s == null || s.isEmpty()) {
                            sb.append("null");
                        } else {
                            sb.append("\"").append(jsonEscape(s)).append("\"");
                        }
                    }
                }
                sb.append("}");
            }
            sb.append("]");
            System.out.write(sb.toString().getBytes(StandardCharsets.UTF_8));
            System.out.println();
        }
    }
}
