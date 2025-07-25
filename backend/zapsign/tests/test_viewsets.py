"""
Tests for ZapSign ViewSets - ENHANCED COVERAGE
"""
import json
from unittest.mock import Mock, patch

from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from ..models import Company, Document, Signer
from ..services.zapsign_service import ZapSignAPIException


class CompanyViewSetTest(APITestCase):
    """Test Company ViewSet"""

    def setUp(self):
        """Set up test data"""
        self.client = APIClient()
        self.company = Company.objects.create(
            name="Test Company", api_token="test-token-123"
        )

    def test_list_companies(self):
        """Test listing companies"""
        url = reverse("company-list")
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("results", response.data)
        self.assertNotIn("api_token", response.data["results"][0])

    def test_create_company(self):
        """Test creating a company"""
        url = reverse("company-list")
        data = {"name": "New Company", "api_token": "new-token-123"}

        response = self.client.post(url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["name"], "New Company")

        # Verify company was created in database
        self.assertTrue(Company.objects.filter(name="New Company").exists())

    def test_retrieve_company(self):
        """Test retrieving a specific company"""
        url = reverse("company-detail", kwargs={"pk": self.company.pk})
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["name"], "Test Company")
        self.assertEqual(response.data["id"], self.company.id)

    def test_update_company(self):
        """Test updating a company"""
        url = reverse("company-detail", kwargs={"pk": self.company.pk})
        data = {"name": "Updated Company Name", "api_token": "updated-token"}

        response = self.client.put(url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["name"], "Updated Company Name")

    def test_partial_update_company(self):
        """Test partially updating a company"""
        url = reverse("company-detail", kwargs={"pk": self.company.pk})
        data = {"name": "Partially Updated Name"}

        response = self.client.patch(url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["name"], "Partially Updated Name")

    def test_delete_company(self):
        """Test deleting a company"""
        url = reverse("company-detail", kwargs={"pk": self.company.pk})
        response = self.client.delete(url)

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Company.objects.filter(pk=self.company.pk).exists())

    def test_create_company_validation_error(self):
        """Test creating company with validation errors"""
        url = reverse("company-list")
        data = {}  # Missing required fields

        response = self.client.post(url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("name", response.data)

    def test_company_ordering(self):
        """Test that companies are ordered by creation date (newest first)"""
        import time

        # Small delay to ensure different creation times
        time.sleep(0.01)

        # Create another company
        newer_company = Company.objects.create(
            name="Newer Company", api_token="token-new"
        )

        url = reverse("company-list")
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        companies = response.data["results"]

        # Verify ordering by checking creation dates or IDs
        self.assertTrue(len(companies) >= 2)

        # Since newer_company was created after self.company, it should come first
        company_names = [c["name"] for c in companies]

        # The newer company should appear before the older one
        newer_index = company_names.index("Newer Company")
        older_index = company_names.index("Test Company")

        self.assertLess(
            newer_index,
            older_index,
            f"Newer company should appear first. Order: {company_names}",
        )


class DocumentViewSetTest(APITestCase):
    """Test Document ViewSet"""

    def setUp(self):
        """Set up test data"""
        self.client = APIClient()
        self.company = Company.objects.create(
            name="Test Company", api_token="test-token-123"
        )
        self.document = Document.objects.create(
            name="Test Document",
            company=self.company,
            created_by="testuser",
            token="doc-token-123",
            open_id=12345,
        )
        self.signer = Signer.objects.create(
            name="John Doe", email="john@example.com", document=self.document
        )

    def test_list_documents(self):
        """Test listing documents"""
        url = reverse("document-list")
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("results", response.data)
        self.assertEqual(response.data["results"][0]["name"], "Test Document")

    def test_retrieve_document(self):
        """Test retrieving a specific document"""
        url = reverse("document-detail", kwargs={"pk": self.document.pk})
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["name"], "Test Document")
        self.assertEqual(response.data["token"], "doc-token-123")
        self.assertIn("signers", response.data)

    @patch("zapsign.viewsets.DocumentService.create_document_with_signers")
    def test_create_document_success(self, mock_create):
        """Test creating a document successfully"""
        mock_create.return_value = self.document

        url = reverse("document-list")
        data = {
            "name": "New Document",
            "pdf_url": "https://example.com/test.pdf",
            "company_id": self.company.id,
            "created_by": "newuser",
            "signers": [{"name": "Signer 1", "email": "signer1@example.com"}],
        }

        response = self.client.post(url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        mock_create.assert_called_once()

    @patch("zapsign.viewsets.DocumentService.create_document_with_signers")
    def test_create_document_zapsign_error(self, mock_create):
        """Test creating document with ZapSign API error"""
        mock_create.side_effect = ZapSignAPIException("API token not found")

        url = reverse("document-list")
        data = {
            "name": "New Document",
            "pdf_url": "https://example.com/test.pdf",
            "company_id": self.company.id,
            "created_by": "newuser",
            "signers": [{"name": "Signer 1", "email": "signer1@example.com"}],
        }

        response = self.client.post(url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_502_BAD_GATEWAY)
        self.assertIn("ZAPSIGN_API_ERROR", response.data["code"])

    def test_create_document_validation_error(self):
        """Test creating document with validation errors"""
        url = reverse("document-list")
        data = {
            "name": "New Document"
            # Missing required fields
        }

        response = self.client.post(url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_update_document(self):
        """Test updating a document"""
        url = reverse("document-detail", kwargs={"pk": self.document.pk})
        data = {"name": "Updated Document Name"}

        response = self.client.patch(url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["name"], "Updated Document Name")

    def test_delete_document(self):
        """Test deleting a document"""
        url = reverse("document-detail", kwargs={"pk": self.document.pk})
        response = self.client.delete(url)

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Document.objects.filter(pk=self.document.pk).exists())

    def test_document_not_found(self):
        """Test accessing non-existent document"""
        url = reverse("document-detail", kwargs={"pk": 99999})
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_document_serializer_selection(self):
        """Test that different serializers are used for different actions"""
        # List action should use DocumentListSerializer
        list_url = reverse("document-list")
        list_response = self.client.get(list_url)
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)

        # Detail action should use DocumentDetailSerializer
        detail_url = reverse("document-detail", kwargs={"pk": self.document.pk})
        detail_response = self.client.get(detail_url)
        self.assertEqual(detail_response.status_code, status.HTTP_200_OK)

        # List response should have company_name and signers_count
        list_doc = list_response.data["results"][0]
        self.assertIn("company_name", list_doc)
        self.assertIn("signers_count", list_doc)

        # Detail response should have full company and signers objects
        detail_doc = detail_response.data
        self.assertIn("company", detail_doc)
        self.assertIn("signers", detail_doc)
        self.assertIsInstance(detail_doc["company"], dict)
        self.assertIsInstance(detail_doc["signers"], list)

    def test_document_ordering(self):
        """Test that documents are ordered by creation date (newest first)"""
        # Create another document
        Document.objects.create(
            name="Newer Document", company=self.company, created_by="user2"
        )

        url = reverse("document-list")
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        documents = response.data["results"]
        self.assertEqual(documents[0]["name"], "Newer Document")  # Newest first

    def test_document_list_with_company_filter(self):
        """Test listing documents with company filter"""
        # Create another company and document
        other_company = Company.objects.create(
            name="Other Company", api_token="other-token"
        )
        Document.objects.create(
            name="Other Document", company=other_company, created_by="otheruser"
        )

        # Filter by our test company
        url = reverse("document-list")
        response = self.client.get(url, {"company_id": self.company.id})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        documents = response.data["results"]
        self.assertEqual(len(documents), 1)
        self.assertEqual(documents[0]["name"], "Test Document")

    def test_document_list_with_invalid_company_filter(self):
        """Test listing documents with invalid company filter"""
        url = reverse("document-list")
        response = self.client.get(url, {"company_id": "invalid"})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)
        self.assertIn("Invalid company_id parameter", response.data["error"])

    @patch("zapsign.viewsets.DocumentService.update_document_status")
    def test_update_status_action_success(self, mock_update):
        """Test updating document status via custom action"""
        mock_update.return_value = self.document

        url = f"/api/documents/{self.document.pk}/update_status/"
        response = self.client.post(url, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        mock_update.assert_called_once_with(self.document.id)

    @patch("zapsign.viewsets.DocumentService.update_document_status")
    def test_update_status_action_error(self, mock_update):
        """Test updating document status with service error"""
        mock_update.side_effect = Exception("Service error")

        url = f"/api/documents/{self.document.pk}/update_status/"
        response = self.client.post(url, format="json")

        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        self.assertIn("error", response.data)
        self.assertIn("Failed to update status", response.data["error"])


class SignerViewSetTest(APITestCase):
    """Test Signer ViewSet - Read Only Operations"""

    def setUp(self):
        """Set up test data"""
        self.client = APIClient()
        self.company = Company.objects.create(
            name="Test Company", api_token="test-token-123"
        )
        self.document = Document.objects.create(
            name="Test Document", company=self.company, created_by="testuser"
        )
        self.signer = Signer.objects.create(
            name="John Doe",
            email="john@example.com",
            document=self.document,
            token="signer-token-123",
        )

    def test_list_signers(self):
        """Test listing signers"""
        url = reverse("signer-list")
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("results", response.data)
        self.assertEqual(response.data["results"][0]["name"], "John Doe")

    def test_retrieve_signer(self):
        """Test retrieving a specific signer"""
        url = reverse("signer-detail", kwargs={"pk": self.signer.pk})
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["name"], "John Doe")
        self.assertEqual(response.data["email"], "john@example.com")

    def test_signer_not_found(self):
        """Test accessing non-existent signer"""
        url = reverse("signer-detail", kwargs={"pk": 99999})
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_signer_ordering(self):
        """Test that signers are ordered by creation date (newest first)"""
        # Create another signer
        Signer.objects.create(
            name="Jane Smith", email="jane@example.com", document=self.document
        )

        url = reverse("signer-list")
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        signers = response.data["results"]
        self.assertEqual(signers[0]["name"], "Jane Smith")  # Newest first


class ViewSetErrorHandlingTest(APITestCase):
    """Test ViewSet error handling and edge cases"""

    def setUp(self):
        """Set up test data"""
        self.client = APIClient()
        self.company = Company.objects.create(
            name="Test Company", api_token="test-token"
        )

    def test_method_not_allowed(self):
        """Test method not allowed errors"""
        # Try to PATCH the list endpoint (only supports GET, POST)
        url = reverse("company-list")
        response = self.client.patch(url, {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_content_type_validation(self):
        """Test content type validation for JSON endpoints"""
        url = reverse("company-list")

        # Test with correct content type
        response = self.client.post(
            url, data={"name": "Test Company", "api_token": "token"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_pagination_structure(self):
        """Test pagination structure in responses"""
        # Create multiple companies
        for i in range(5):
            Company.objects.create(name=f"Company {i}", api_token=f"token-{i}")

        url = reverse("company-list")
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("count", response.data)
        self.assertIn("next", response.data)
        self.assertIn("previous", response.data)
        self.assertIn("results", response.data)

    @patch("zapsign.viewsets.DocumentService.create_document_with_signers")
    def test_document_creation_with_service_exception(self, mock_create):
        """Test document creation when service raises unexpected exception"""
        mock_create.side_effect = Exception("Unexpected error")

        url = reverse("document-list")
        data = {
            "name": "Test Document",
            "pdf_url": "https://example.com/test.pdf",
            "company_id": self.company.id,
            "created_by": "user",
            "signers": [],
        }

        response = self.client.post(url, data, format="json")

        # The viewset catches generic exceptions and returns 400 Bad Request
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_large_payload_handling(self):
        """Test handling of large payloads"""
        url = reverse("document-list")

        # Create a large signers list
        large_signers = []
        for i in range(50):
            large_signers.append(
                {"name": f"Signer {i}", "email": f"signer{i}@example.com"}
            )

        data = {
            "name": "Large Document",
            "pdf_url": "https://example.com/test.pdf",
            "company_id": self.company.id,
            "created_by": "user",
            "signers": large_signers,
        }

        # Should handle large payloads gracefully
        with patch(
            "zapsign.viewsets.DocumentService.create_document_with_signers"
        ) as mock_create:
            mock_create.return_value = Document.objects.create(
                name="Large Document", company=self.company, created_by="user"
            )

            response = self.client.post(url, data, format="json")
            self.assertEqual(response.status_code, status.HTTP_201_CREATED)
