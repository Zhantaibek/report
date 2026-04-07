import java.sql.*;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.nio.charset.StandardCharsets;

/**
 * Oracle JDBC query bridge for Gold Contract report.
 * Usage: java -cp .;classes12.zip OracleGoldQuery <host> <port> <sid> <user> <password> <dateFrom> <dateTo> [ownId]
 * Dates format: YYYY-MM-DD
 * Output: JSON array to stdout, errors to stderr.
 *
 * Сделки: SYS.DEAL1 (архив) + TS.DEAL, дедуп по SERIAL.
 * Инструмент: TS.TS_CURRINSTRUMENT_ARCTS ci при ci.DEALS_ID = t.OWNID (как в вашем SELECT);
 * имена — NAMERUS/EXTCODE с ci. Параметр API = ID из CURRINSTRUMENT;
 * фильтр t.OWNID = значение + 1 (как для DEAL.OWNID).
 * Стороны: в SYS.DEAL1/TS.DEAL две строки на SERIAL, связь d2.ID = d1.IDPAIR; берём d1 с меньшим ID как одну сторону,
 * d2 как другую (seller/buyer). В TS.DEAL при отсутствии пары — fallback на CPUSERID/CPIDTRDACC.
 */
public class OracleGoldQuery {

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
        long   ownIdArg = args.length > 7 ? Long.parseLong(args[7]) : 8853816L;
        long   ownId    = ownIdArg + 1;

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
            "  CASE WHEN t.VOLUME > 0 THEN t.VALUE_AMT / t.VOLUME ELSE NVL(t.UNIT_PRICE, 0) END AS price, " +
            "  t.VALUE_AMT                          AS value, " +
            "  o_sel.NAME                           AS seller_name, " +
            "  ta_sel.CODE                          AS sell_account, " +
            "  ut_sel.NAME                          AS seller_trader, " +
            "  o_buy.NAME                           AS buyer_name, " +
            "  ta_buy.CODE                          AS buy_account, " +
            "  ut_buy.NAME                          AS buyer_trader, " +
            "  ci.NAMERUS                           AS issuer_namerus, " +
            "  ci.EXTCODE                           AS sec_extcode " +
            "FROM " +
            "  (SELECT TO_DATE(?, 'YYYY-MM-DD') + ROWNUM - 1 AS dt " +
            "   FROM SYS.DEAL1 " +
            "   WHERE ROWNUM <= " + dayCount + ") dates, " +
            "  (SELECT x.SERIAL, x.VOLUME, x.VALUE_AMT, x.UNIT_PRICE, x.DATE0, x.OWNID, " +
            "          x.USERID, x.IDTRDACC, x.CPUSERID, x.CPIDTRDACC " +
            "   FROM ( " +
            "     SELECT u.*, ROW_NUMBER() OVER (PARTITION BY u.SERIAL ORDER BY u.DATE0 DESC) AS rn " +
            "     FROM ( " +
            "       SELECT d1.SERIAL, d1.VOLUME, " +
            "              NVL(d1.PRICE, 0) * NVL(d1.VOLUME, 0) AS VALUE_AMT, " +
            "              NVL(d1.PRICE, 0) AS UNIT_PRICE, " +
            "              d1.DATE0, d1.OWNID, " +
            "              d1.USERID, d1.IDTRDACC, " +
            "              d2.USERID AS CPUSERID, d2.IDTRDACC AS CPIDTRDACC " +
            "       FROM SYS.DEAL1 d1, SYS.DEAL1 d2 " +
            "       WHERE d1.DATE0 BETWEEN makelongdate(TO_DATE(?, 'YYYY-MM-DD')) " +
            "                         AND makelongdate(TO_DATE(?, 'YYYY-MM-DD')) " +
            "         AND d1.OWNID = " + ownId +
            "         AND d1.ID < d1.IDPAIR " +
            "         AND d1.IDPAIR = d2.ID(+) " +
            "         AND d1.OWNID = d2.OWNID(+) " +
            "         AND d1.SERIAL = d2.SERIAL(+) " +
            "       UNION ALL " +
            "       SELECT d1.SERIAL, d1.VOLUME, " +
            "              NVL(d1.VOLCONTR, 0) AS VALUE_AMT, " +
            "              CASE WHEN d1.VOLUME > 0 THEN NVL(d1.VOLCONTR, 0) / d1.VOLUME ELSE 0 END AS UNIT_PRICE, " +
            "              d1.DATE0, d1.OWNID, " +
            "              d1.USERID, d1.IDTRDACC, " +
            "              NVL(d2.USERID, d1.CPUSERID) AS CPUSERID, " +
            "              NVL(d2.IDTRDACC, d1.CPIDTRDACC) AS CPIDTRDACC " +
            "       FROM TS.DEAL d1, TS.DEAL d2 " +
            "       WHERE d1.DATE0 BETWEEN makelongdate(TO_DATE(?, 'YYYY-MM-DD')) " +
            "                         AND makelongdate(TO_DATE(?, 'YYYY-MM-DD')) " +
            "         AND d1.OWNID = " + ownId +
            "         AND d1.ID < d1.IDPAIR " +
            "         AND d1.IDPAIR = d2.ID(+) " +
            "         AND d1.OWNID = d2.OWNID(+) " +
            "         AND d1.SERIAL = d2.SERIAL(+) " +
            "     ) u " +
            "   ) x " +
            "   WHERE x.rn = 1) t, " +
            "  TS.TS_CURRINSTRUMENT_ARCTS ci, " +
            "  TS.USERTRADER ut_sel, " +
            "  TS.FIRM f_sel, " +
            "  TS.ORGANIZATION o_sel, " +
            "  TS.TRADEACCOUNT ta_sel, " +
            "  TS.USERTRADER ut_buy, " +
            "  TS.FIRM f_buy, " +
            "  TS.ORGANIZATION o_buy, " +
            "  TS.TRADEACCOUNT ta_buy " +
            "WHERE t.DATE0 >= makelongdate(dates.dt) " +
            "  AND t.DATE0 <  makelongdate(dates.dt + 1) " +
            "  AND ci.DEALS_ID(+) = t.OWNID " +
            "  AND ut_sel.ID(+) = t.USERID " +
            "  AND f_sel.ID(+) = ut_sel.IDFIRM " +
            "  AND o_sel.ID(+) = f_sel.IDORGAN " +
            "  AND ta_sel.ID(+) = t.IDTRDACC " +
            "  AND ut_buy.ID(+) = t.CPUSERID " +
            "  AND f_buy.ID(+) = ut_buy.IDFIRM " +
            "  AND o_buy.ID(+) = f_buy.IDORGAN " +
            "  AND ta_buy.ID(+) = t.CPIDTRDACC " +
            "ORDER BY t.SERIAL";

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
                    if (col.equals("serial") || col.equals("quantity") || col.equals("price") || col.equals("value")) {
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
