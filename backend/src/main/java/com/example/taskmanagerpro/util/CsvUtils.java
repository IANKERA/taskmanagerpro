package com.example.taskmanagerpro.util;

public final class CsvUtils {

    private CsvUtils() {
    }

    public static String escape(String value) {
        if (value == null) {
            return "";
        }

        String safeValue = value;
        String valueWithoutLeadingWhitespace = value.stripLeading();
        if (!valueWithoutLeadingWhitespace.isEmpty()
                && "=+-@".indexOf(valueWithoutLeadingWhitespace.charAt(0)) >= 0) {
            safeValue = "'" + value;
        }

        if (safeValue.contains(",") || safeValue.contains("\"")
                || safeValue.contains("\n") || safeValue.contains("\r")) {
            return "\"" + safeValue.replace("\"", "\"\"") + "\"";
        }
        return safeValue;
    }
}
