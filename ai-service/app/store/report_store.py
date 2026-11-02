import json
import sqlite3
from pathlib import Path
from typing import Dict, Any, Optional, List
from datetime import datetime


class ReportStore:
    def __init__(self, db_path: Optional[Path] = None):
        if db_path is None:
            db_dir = Path(__file__).resolve().parent.parent.parent / "data"
            db_dir.mkdir(parents=True, exist_ok=True)
            self.db_path = db_dir / "reports.db"
        else:
            self.db_path = db_path
        self._init_db()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(str(self.db_path), check_same_thread=False)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self):
        with self._get_connection() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS explanation_reports (
                    explanation_hash TEXT PRIMARY KEY,
                    doc_id TEXT NOT NULL,
                    doc_hash TEXT NOT NULL,
                    verdict INTEGER NOT NULL,
                    confidence_bps INTEGER NOT NULL,
                    applicant_address TEXT,
                    report_json TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                """
            )
            conn.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_doc_id ON explanation_reports (doc_id);
                """
            )
            conn.commit()

    def save_report(
        self,
        explanation_hash: str,
        doc_id: str,
        doc_hash: str,
        verdict: int,
        confidence_bps: int,
        report_data: Dict[str, Any],
        applicant_address: Optional[str] = None,
    ):
        report_json_str = json.dumps(report_data)
        with self._get_connection() as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO explanation_reports (
                    explanation_hash, doc_id, doc_hash, verdict,
                    confidence_bps, applicant_address, report_json, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    explanation_hash,
                    doc_id,
                    doc_hash,
                    verdict,
                    confidence_bps,
                    applicant_address or "",
                    report_json_str,
                    datetime.utcnow().isoformat(),
                ),
            )
            conn.commit()

    def get_report(self, explanation_hash: str) -> Optional[Dict[str, Any]]:
        with self._get_connection() as conn:
            cur = conn.execute(
                "SELECT report_json FROM explanation_reports WHERE explanation_hash = ?",
                (explanation_hash,),
            )
            row = cur.fetchone()
            if row:
                return json.loads(row["report_json"])
        return None

    def get_reports_by_doc_id(self, doc_id: str) -> List[Dict[str, Any]]:
        with self._get_connection() as conn:
            cur = conn.execute(
                "SELECT report_json FROM explanation_reports WHERE doc_id = ? ORDER BY created_at DESC",
                (doc_id,),
            )
            results = []
            for row in cur.fetchall():
                try:
                    results.append({"report_data": json.loads(row["report_json"])})
                except Exception:
                    pass
            return results

    def list_reports(self, limit: int = 50) -> List[Dict[str, Any]]:
        with self._get_connection() as conn:
            cur = conn.execute(
                """
                SELECT explanation_hash, doc_id, doc_hash, verdict, confidence_bps, created_at
                FROM explanation_reports ORDER BY created_at DESC LIMIT ?
                """,
                (limit,),
            )
            return [dict(r) for r in cur.fetchall()]


report_store = ReportStore()
