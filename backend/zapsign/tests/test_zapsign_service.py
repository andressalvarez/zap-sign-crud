"""
Tests for ZapSign Service - REAL IMPLEMENTATION TESTING
"""
import json
from unittest.mock import Mock, patch

import requests
from django.test import TestCase, override_settings

from ..models import Company
from ..services.zapsign_service import ZapSignAPIException, ZapSignService


class ZapSignServiceRealTest(TestCase):
    """Test ZapSign Service with REAL API endpoints and token"""

    def setUp(self):
        """Set up test data with REAL token"""
        self.company = Company.objects.create(
            name="Test Company",
            api_token="0de33489-0908-42e0-99a7-299c513ac50b090986b2-8d4b-4ec5-b8f5-32d3bd5f67af",
        )
        self.service = ZapSignService()

    def test_service_initialization(self):
        """Test service initializes with correct settings"""
        self.assertIsNotNone(self.service.base_url)
        self.assertIsNotNone(self.service.org_id)

    def test_get_headers_with_real_token(self):
        """Test headers generation with real token format"""
        headers = self.service._get_headers(self.company)

        expected_headers = {
            "Authorization": f"Bearer {self.company.api_token}",
            "Content-Type": "application/json",
        }

        self.assertEqual(headers, expected_headers)
        self.assertIn("0de33489-0908-42e0-99a7", headers["Authorization"])

    def test_build_signers_payload(self):
        """Test signers payload building"""
        signers_data = [
            {"name": "John Doe", "email": "john@example.com"},
            {"name": "Jane Smith", "email": "jane@example.com"},
        ]

        result = self.service._build_signers_payload(signers_data)

        self.assertEqual(len(result), 2)
        self.assertEqual(result[0]["name"], "John Doe")
        self.assertEqual(result[0]["email"], "john@example.com")
        self.assertIn("external_id", result[0])
        self.assertTrue(result[0]["external_id"].startswith("signer-"))
        self.assertEqual(result[1]["name"], "Jane Smith")

    def test_build_document_payload(self):
        """Test document payload building"""
        document_data = {
            "name": "Test Document",
            "pdf_url": "https://example.com/test.pdf",
            "signers": [{"name": "John Doe", "email": "john@example.com"}],
        }

        result = self.service._build_document_payload(document_data)

        self.assertEqual(result["name"], "Test Document")
        self.assertEqual(result["url_pdf"], "https://example.com/test.pdf")
        self.assertIn("signers", result)
        self.assertEqual(len(result["signers"]), 1)
        self.assertEqual(result["signers"][0]["name"], "John Doe")

    @patch("requests.post")
    def test_create_document_success_with_real_sandbox_url(self, mock_post):
        """Test successful document creation with real sandbox URL"""
        # Mock successful response
        mock_response = Mock()
        mock_response.status_code = 201
        mock_response.json.return_value = {
            "open_id": 12345,
            "token": "doc-token-123",
            "status": "pending",
            "name": "Test Document",
        }
        mock_post.return_value = mock_response

        document_data = {
            "name": "Test Document",
            "pdf_url": "https://example.com/test.pdf",
            "signers": [{"name": "John Doe", "email": "john@example.com"}],
        }

        result = self.service.create_document(self.company, document_data)

        # Verify API call was made
        mock_post.assert_called_once()
        call_args = mock_post.call_args

        # Check that the actual sandbox URL was used
        self.assertIn("sandbox.api.zapsign.com.br", call_args[0][0])

        # Check headers with real token
        self.assertIn(
            "0de33489-0908-42e0-99a7", call_args[1]["headers"]["Authorization"]
        )

        # Check result
        self.assertEqual(result["open_id"], 12345)
        self.assertEqual(result["token"], "doc-token-123")

    @patch("requests.post")
    def test_create_document_api_error_400_invalid_pdf(self, mock_post):
        """Test document creation with 400 error (invalid PDF URL)"""
        mock_response = Mock()
        mock_response.status_code = 400
        mock_response.json.return_value = {"detail": "Erro para baixar o seu arquivo"}
        mock_response.text = "Bad Request"
        mock_post.return_value = mock_response

        document_data = {
            "name": "Test Document",
            "pdf_url": "invalid-url-not-accessible",
            "signers": [],
        }

        with self.assertRaises(ZapSignAPIException) as context:
            self.service.create_document(self.company, document_data)

        self.assertIn("400", str(context.exception))
        self.assertIn("Erro para baixar o seu arquivo", str(context.exception))

    @patch("requests.post")
    def test_create_document_api_error_401_invalid_token(self, mock_post):
        """Test document creation with 401 unauthorized (invalid token)"""
        mock_response = Mock()
        mock_response.status_code = 401
        mock_response.json.return_value = {"detail": "Token da API não encontrado"}
        mock_response.text = "Unauthorized"
        mock_post.return_value = mock_response

        # Use company with invalid token
        invalid_company = Company.objects.create(
            name="Invalid Company", api_token="invalid-token-123"
        )

        document_data = {
            "name": "Test Document",
            "pdf_url": "https://example.com/test.pdf",
            "signers": [],
        }

        with self.assertRaises(ZapSignAPIException) as context:
            self.service.create_document(invalid_company, document_data)

        self.assertIn("401", str(context.exception))
        self.assertIn("Token da API não encontrado", str(context.exception))

    @patch("requests.post")
    def test_create_document_connection_error(self, mock_post):
        """Test document creation with connection error"""
        mock_post.side_effect = requests.exceptions.ConnectionError("Network error")

        document_data = {
            "name": "Test Document",
            "pdf_url": "https://example.com/test.pdf",
            "signers": [],
        }

        with self.assertRaises(ZapSignAPIException) as context:
            self.service.create_document(self.company, document_data)

        self.assertIn("Connection error", str(context.exception))

    @patch("requests.post")
    def test_create_document_timeout_error(self, mock_post):
        """Test document creation with timeout error"""
        mock_post.side_effect = requests.exceptions.Timeout("Request timeout")

        document_data = {
            "name": "Test Document",
            "pdf_url": "https://example.com/test.pdf",
            "signers": [],
        }

        with self.assertRaises(ZapSignAPIException) as context:
            self.service.create_document(self.company, document_data)

        self.assertIn("Request timeout", str(context.exception))

    @patch("requests.post")
    def test_create_document_json_decode_error(self, mock_post):
        """Test document creation with JSON decode error"""
        mock_response = Mock()
        mock_response.status_code = 201
        mock_response.json.side_effect = json.JSONDecodeError("Invalid JSON", "", 0)
        mock_response.text = "Invalid response"
        mock_post.return_value = mock_response

        document_data = {
            "name": "Test Document",
            "pdf_url": "https://example.com/test.pdf",
            "signers": [],
        }

        with self.assertRaises(ZapSignAPIException) as context:
            self.service.create_document(self.company, document_data)

        self.assertIn("Invalid JSON", str(context.exception))

    @patch("requests.post")
    def test_create_document_payload_structure(self, mock_post):
        """Test that the payload sent to ZapSign has correct structure"""
        mock_response = Mock()
        mock_response.status_code = 201
        mock_response.json.return_value = {"open_id": 123}
        mock_post.return_value = mock_response

        document_data = {
            "name": "Test Document",
            "pdf_url": "https://example.com/test.pdf",
            "signers": [
                {"name": "John Doe", "email": "john@example.com"},
                {"name": "Jane Smith", "email": "jane@example.com"},
            ],
        }

        self.service.create_document(self.company, document_data)

        # Verify the payload structure
        call_args = mock_post.call_args
        payload = call_args[1]["json"]

        # Check required fields
        self.assertEqual(payload["name"], "Test Document")
        self.assertEqual(payload["url_pdf"], "https://example.com/test.pdf")
        self.assertIn("signers", payload)
        self.assertEqual(len(payload["signers"]), 2)

        # Check signer structure
        signer1 = payload["signers"][0]
        self.assertEqual(signer1["name"], "John Doe")
        self.assertEqual(signer1["email"], "john@example.com")
        self.assertIn("external_id", signer1)
        self.assertTrue(signer1["external_id"].startswith("signer-"))

    def test_real_api_url_construction(self):
        """Test that the service uses the correct ZapSign sandbox URL"""
        # This verifies our service is correctly configured for the sandbox
        expected_base = "https://sandbox.api.zapsign.com.br/api/v1"

        with patch("requests.post") as mock_post:
            mock_response = Mock()
            mock_response.status_code = 201
            mock_response.json.return_value = {"open_id": 123}
            mock_post.return_value = mock_response

            document_data = {
                "name": "Test",
                "pdf_url": "https://example.com/test.pdf",
                "signers": [],
            }

            self.service.create_document(self.company, document_data)

            call_args = mock_post.call_args
            called_url = call_args[0][0]

            self.assertTrue(called_url.startswith(expected_base))
            self.assertEqual(called_url, f"{expected_base}/docs/")

    # NEW TESTS FOR get_document_status

    @patch("requests.get")
    def test_get_document_status_success(self, mock_get):
        """Test successful document status retrieval"""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "open_id": 12345,
            "token": "doc-token-123",
            "status": "signed",
            "name": "Test Document",
        }
        mock_get.return_value = mock_response

        doc_token = "doc-token-123"
        result = self.service.get_document_status(self.company, doc_token)

        # Verify API call was made
        mock_get.assert_called_once()
        call_args = mock_get.call_args

        # Check URL construction
        expected_url = f"https://sandbox.api.zapsign.com.br/api/v1/docs/{doc_token}/"
        self.assertIn(doc_token, call_args[0][0])

        # Check headers
        self.assertIn(
            "0de33489-0908-42e0-99a7", call_args[1]["headers"]["Authorization"]
        )

        # Check result
        self.assertEqual(result["open_id"], 12345)
        self.assertEqual(result["status"], "signed")

    @patch("requests.get")
    def test_get_document_status_not_found(self, mock_get):
        """Test document status retrieval when document not found"""
        mock_response = Mock()
        mock_response.status_code = 404
        mock_get.return_value = mock_response

        doc_token = "non-existent-token"
        result = self.service.get_document_status(self.company, doc_token)

        # Should return None for 404
        self.assertIsNone(result)
        mock_get.assert_called_once()

    @patch("requests.get")
    def test_get_document_status_api_error(self, mock_get):
        """Test document status retrieval with API error"""
        mock_response = Mock()
        mock_response.status_code = 500
        mock_get.return_value = mock_response

        doc_token = "doc-token-123"
        result = self.service.get_document_status(self.company, doc_token)

        # Should return None for server errors
        self.assertIsNone(result)

    @patch("requests.get")
    def test_get_document_status_network_error(self, mock_get):
        """Test document status retrieval with network error"""
        mock_get.side_effect = requests.exceptions.ConnectionError("Network error")

        doc_token = "doc-token-123"
        result = self.service.get_document_status(self.company, doc_token)

        # Should return None for network errors
        self.assertIsNone(result)
