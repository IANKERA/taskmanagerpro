package com.example.taskmanagerpro.util;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class CsvUtilsTests {

    @Test
    void quotesCsvFieldsAndEscapesEmbeddedQuotesAndLineBreaks() {
        assertEquals("\"Task, \"\"urgent\"\"\r\nnext\"", CsvUtils.escape("Task, \"urgent\"\r\nnext"));
    }

    @Test
    void neutralizesSpreadsheetFormulasAfterLeadingWhitespace() {
        assertEquals("\"'  =HYPERLINK(\"\"https://example.invalid\"\")\"",
                CsvUtils.escape("  =HYPERLINK(\"https://example.invalid\")"));
        assertEquals("'+SUM(A1:A2)", CsvUtils.escape("+SUM(A1:A2)"));
        assertEquals("'-1+2", CsvUtils.escape("-1+2"));
        assertEquals("'@SUM(A1:A2)", CsvUtils.escape("@SUM(A1:A2)"));
    }

    @Test
    void leavesOrdinaryAndNullValuesSafe() {
        assertEquals("ordinary text", CsvUtils.escape("ordinary text"));
        assertEquals("", CsvUtils.escape(null));
    }
}
