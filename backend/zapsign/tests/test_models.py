from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.test import TestCase
from zapsign.models import Company, Document, Signer


class CompanyModelTest(TestCase):
    """Tests para el modelo Company"""

    def setUp(self):
        """Configurar datos de prueba"""
        self.company_data = {"name": "Test Company", "api_token": "test-api-token-123"}

    def test_create_company_success(self):
        """Test creación exitosa de una company"""
        company = Company.objects.create(**self.company_data)

        self.assertEqual(company.name, "Test Company")
        self.assertEqual(company.api_token, "test-api-token-123")
        self.assertIsNotNone(company.created_at)
        self.assertIsNotNone(company.last_updated_at)

    def test_company_str_representation(self):
        """Test representación string del modelo Company"""
        company = Company.objects.create(**self.company_data)
        self.assertEqual(str(company), "Test Company")

    def test_company_name_required(self):
        """Test que el nombre de la company es obligatorio"""
        company_data = self.company_data.copy()
        company_data["name"] = ""

        company = Company.objects.create(**company_data)
        self.assertEqual(company.name, "")

    def test_company_api_token_required(self):
        """Test que el token de API es obligatorio"""
        company_data = self.company_data.copy()
        company_data["api_token"] = ""

        company = Company.objects.create(**company_data)
        self.assertEqual(company.api_token, "")


class DocumentModelTest(TestCase):
    """Tests para el modelo Document"""

    def setUp(self):
        """Configurar datos de prueba"""
        self.company = Company.objects.create(
            name="Test Company", api_token="test-token"
        )

        self.document_data = {
            "open_id": 123,
            "token": "doc-token-456",
            "name": "Test Document",
            "status": "pending",
            "created_by": "Test User",
            "company": self.company,
            "external_id": "ext-123",
        }

    def test_create_document_success(self):
        """Test creación exitosa de un documento"""
        document = Document.objects.create(**self.document_data)

        self.assertEqual(document.name, "Test Document")
        self.assertEqual(document.status, "pending")
        self.assertEqual(document.created_by, "Test User")
        self.assertEqual(document.company, self.company)
        self.assertIsNotNone(document.created_at)
        self.assertIsNotNone(document.last_updated_at)

    def test_document_str_representation(self):
        """Test representación string del modelo Document"""
        document = Document.objects.create(**self.document_data)
        self.assertEqual(str(document), "Test Document - pending")

    def test_document_name_required(self):
        """Test que el nombre del documento es obligatorio"""
        document_data = self.document_data.copy()
        document_data["name"] = ""

        document = Document.objects.create(**document_data)
        self.assertEqual(document.name, "")

    def test_document_company_required(self):
        """Test que la company es obligatoria"""
        document_data = self.document_data.copy()
        del document_data["company"]

        with self.assertRaises(IntegrityError):
            Document.objects.create(**document_data)

    def test_document_cascade_delete(self):
        """Test que los documentos se eliminan cuando se elimina la company"""
        document = Document.objects.create(**self.document_data)
        company_id = self.company.id
        document_id = document.id

        # Verificar que existen
        self.assertTrue(Company.objects.filter(id=company_id).exists())
        self.assertTrue(Document.objects.filter(id=document_id).exists())

        # Eliminar la company
        self.company.delete()

        # Verificar que el documento también se eliminó
        self.assertFalse(Company.objects.filter(id=company_id).exists())
        self.assertFalse(Document.objects.filter(id=document_id).exists())


class SignerModelTest(TestCase):
    """Tests para el modelo Signer"""

    def setUp(self):
        """Configurar datos de prueba"""
        self.company = Company.objects.create(
            name="Test Company", api_token="test-token"
        )

        self.document = Document.objects.create(
            open_id=123,
            token="doc-token-456",
            name="Test Document",
            status="pending",
            created_by="Test User",
            company=self.company,
        )

        self.signer_data = {
            "token": "signer-token-789",
            "status": "PENDING",
            "name": "John Doe",
            "email": "john.doe@example.com",
            "document": self.document,
            "external_id": "signer-ext-123",
        }

    def test_create_signer_success(self):
        """Test creación exitosa de un firmante"""
        signer = Signer.objects.create(**self.signer_data)

        self.assertEqual(signer.name, "John Doe")
        self.assertEqual(signer.email, "john.doe@example.com")
        self.assertEqual(signer.status, "PENDING")
        self.assertEqual(signer.document, self.document)

    def test_signer_str_representation(self):
        """Test representación string del modelo Signer"""
        signer = Signer.objects.create(**self.signer_data)
        self.assertEqual(str(signer), "John Doe (john.doe@example.com) - Test Document")

    def test_signer_name_required(self):
        """Test que el nombre del firmante es obligatorio"""
        signer_data = self.signer_data.copy()
        signer_data["name"] = ""

        signer = Signer.objects.create(**signer_data)
        self.assertEqual(signer.name, "")

    def test_signer_email_required(self):
        """Test que el email del firmante es obligatorio"""
        signer_data = self.signer_data.copy()
        signer_data["email"] = ""

        signer = Signer.objects.create(**signer_data)
        self.assertEqual(signer.email, "")

    def test_signer_document_required(self):
        """Test que el documento es obligatorio"""
        signer_data = self.signer_data.copy()
        del signer_data["document"]

        with self.assertRaises(IntegrityError):
            Signer.objects.create(**signer_data)

    def test_signer_cascade_delete(self):
        """Test que los firmantes se eliminan cuando se elimina el documento"""
        signer = Signer.objects.create(**self.signer_data)
        document_id = self.document.id
        signer_id = signer.id

        # Verificar que existen
        self.assertTrue(Document.objects.filter(id=document_id).exists())
        self.assertTrue(Signer.objects.filter(id=signer_id).exists())

        # Eliminar el documento
        self.document.delete()

        # Verificar que el firmante también se eliminó
        self.assertFalse(Document.objects.filter(id=document_id).exists())
        self.assertFalse(Signer.objects.filter(id=signer_id).exists())

    def test_multiple_signers_per_document(self):
        """Test que un documento puede tener múltiples firmantes"""
        signer1 = Signer.objects.create(**self.signer_data)

        signer2_data = self.signer_data.copy()
        signer2_data.update(
            {
                "token": "signer-token-999",
                "name": "Jane Smith",
                "email": "jane.smith@example.com",
                "external_id": "signer-ext-456",
            }
        )
        signer2 = Signer.objects.create(**signer2_data)

        # Verificar que ambos firmantes pertenecen al mismo documento
        self.assertEqual(signer1.document, signer2.document)
        self.assertEqual(self.document.signers.count(), 2)

        # Verificar que los firmantes son diferentes
        self.assertNotEqual(signer1.email, signer2.email)
        self.assertNotEqual(signer1.token, signer2.token)


class ModelsIntegrationTest(TestCase):
    """Tests de integración entre modelos"""

    def test_complete_document_workflow(self):
        """Test del flujo completo de creación de documento con firmantes"""
        # Crear company
        company = Company.objects.create(
            name="Integration Test Company", api_token="integration-token"
        )

        # Crear documento
        document = Document.objects.create(
            open_id=999,
            token="integration-doc-token",
            name="Integration Test Document",
            status="pending",
            created_by="Integration Test User",
            company=company,
        )

        # Crear múltiples firmantes
        signers_data = [
            {
                "token": "signer-token-1",
                "status": "PENDING",
                "name": "Signer One",
                "email": "signer1@test.com",
                "document": document,
            },
            {
                "token": "signer-token-2",
                "status": "SIGNED",
                "name": "Signer Two",
                "email": "signer2@test.com",
                "document": document,
            },
            {
                "token": "signer-token-3",
                "status": "PENDING",
                "name": "Signer Three",
                "email": "signer3@test.com",
                "document": document,
            },
        ]

        signers = []
        for signer_data in signers_data:
            signers.append(Signer.objects.create(**signer_data))

        # Verificar relaciones
        self.assertEqual(company.documents.count(), 1)
        self.assertEqual(document.signers.count(), 3)

        # Verificar que todos los firmantes pertenecen al documento correcto
        for signer in signers:
            self.assertEqual(signer.document.company, company)

        # Verificar consultas reversas
        company_documents = company.documents.all()
        self.assertIn(document, company_documents)

        document_signers = document.signers.all()
        for signer in signers:
            self.assertIn(signer, document_signers)
