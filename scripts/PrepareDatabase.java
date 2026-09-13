import java.sql.DriverManager;

// Used only by Start-Database.ps1 for the isolated local demo database.
class PrepareDatabase {
    public static void main(String[] args) throws Exception {
        try (var connection = DriverManager.getConnection("jdbc:postgresql://127.0.0.1:5432/postgres", "warehouse", "warehouse");
             var statement = connection.createStatement()) {
            boolean exists;
            try (var result = statement.executeQuery("SELECT 1 FROM pg_database WHERE datname = 'warehouse'")) { exists = result.next(); }
            if (!exists) statement.executeUpdate("CREATE DATABASE warehouse");
            System.out.println("Database ready: localhost:5432/warehouse (user: warehouse)");
        }
    }
}
