import java.sql.*;

/**
 * Returns list of instruments from ARCTS.CURRINSTRUMENT as JSON.
 * Usage: java -cp .;classes12.zip OracleInstruments <host> <port> <sid> <user> <password>
 */
public class OracleInstruments {

    /**
     * Reads raw bytes from VARCHAR column and decodes as Windows-1251.
     * This bypasses JDBC character set conversion which replaces unknowns with '?'.
     */
    static String decodeColumn(ResultSet rs, String col) throws Exception {
        byte[] bytes = rs.getBytes(col);
        if (bytes == null) return "";
        String s = new String(bytes, "UTF-8").trim();
        return s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\r", " ").replace("\n", " ");
    }

    public static void main(String[] args) throws Exception {
        if (args.length < 5) {
            System.err.println("Usage: OracleInstruments <host> <port> <sid> <user> <password>");
            System.exit(1);
        }
        String host     = args[0];
        String port     = args[1];
        String sid      = args[2];
        String user     = args[3];
        String password = args[4];

        String url = "jdbc:oracle:thin:@" + host + ":" + port + ":" + sid;
        Class.forName("oracle.jdbc.driver.OracleDriver");

        String sql = "SELECT ID, NAMERUS, EXTCODE FROM CURRINSTRUMENT ORDER BY ID";

        try (Connection conn = DriverManager.getConnection(url, user, password);
             PreparedStatement ps = conn.prepareStatement(sql);
             ResultSet rs = ps.executeQuery()) {

            StringBuilder sb = new StringBuilder("[");
            boolean first = true;
            while (rs.next()) {
                if (!first) sb.append(",");
                first = false;
                long id    = rs.getLong("ID");
                String name = decodeColumn(rs, "NAMERUS");
                String ext  = decodeColumn(rs, "EXTCODE");
                sb.append("{\"id\":").append(id)
                  .append(",\"namerus\":\"").append(name).append("\"")
                  .append(",\"extcode\":\"").append(ext).append("\"}");
            }
            sb.append("]");
            // Write output as UTF-8 explicitly
            System.out.write(sb.toString().getBytes("UTF-8"));
            System.out.println();
        }
    }
}
