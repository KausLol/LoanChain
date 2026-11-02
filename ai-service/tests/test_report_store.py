from app.store.report_store import ReportStore


def test_report_store_save_and_get(tmp_path):
    db_file = tmp_path / "test_reports.db"
    store = ReportStore(db_path=db_file)

    test_hash = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
    report_data = {
        "verdict": 0,
        "summary": "Document passed all checks",
        "reason_codes": [],
        "extracted_fields": {"name": "AARAV MEHTA"},
    }

    store.save_report(
        explanation_hash=test_hash,
        doc_id="0xdoc1",
        doc_hash="0xhash1",
        verdict=0,
        confidence_bps=9500,
        report_data=report_data,
        applicant_address="0xabc123",
    )

    retrieved = store.get_report(test_hash)
    assert retrieved is not None
    assert retrieved["summary"] == "Document passed all checks"
    assert retrieved["extracted_fields"]["name"] == "AARAV MEHTA"

    # Non-existent report
    assert store.get_report("0xnonexistent") is None
