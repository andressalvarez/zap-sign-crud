"""
Document Service - Application Layer
"""
import logging
from typing import Any, Dict, List

from django.db import transaction

from ..models import Company, Document, Signer
from .zapsign_service import ZapSignAPIException, ZapSignService

logger = logging.getLogger(__name__)


class DocumentService:
    """
    Service for managing documents and their integration with ZapSign
    """

    def __init__(self):
        self.zapsign_service = ZapSignService()

    @transaction.atomic
    def create_document_with_signers(
        self,
        company_id: int,
        document_data: Dict[str, Any],
        signers_data: List[Dict[str, str]],
        created_by: str,
    ) -> Document:
        """
        Create a document with signers and integrate with ZapSign API

        Args:
            company_id: ID of the company
            document_data: Document information (name, pdf_url)
            signers_data: List of signer information (name, email)
            created_by: User who created the document

        Returns:
            Created Document instance

        Raises:
            ZapSignAPIException: If ZapSign API fails
        """
        try:
            # Get company
            company = Company.objects.get(id=company_id)

            # Create document stub with PENDING_API status
            document = Document.objects.create(
                name=document_data["name"],
                company=company,
                created_by=created_by,
                status="PENDING_API",
            )

            # Create signers in local DB first
            signers = []
            for signer_data in signers_data:
                signer = Signer.objects.create(
                    name=signer_data["name"],
                    email=signer_data["email"],
                    document=document,
                    status="PENDING",
                )
                signers.append(signer)

            # Prepare data for ZapSign API
            api_document_data = {
                "name": document_data["name"],
                "pdf_url": document_data["pdf_url"],
                "signers": [
                    {"name": signer.name, "email": signer.email} for signer in signers
                ],
            }

            # Call ZapSign API
            logger.info(f"Calling ZapSign API for document: {document.name}")
            zapsign_response = self.zapsign_service.create_document(
                company, api_document_data
            )

            # Update document with ZapSign response data
            document.open_id = zapsign_response.get("open_id")
            document.token = zapsign_response.get("token")
            document.external_id = zapsign_response.get("external_id")
            document.status = zapsign_response.get("status", "PENDING")
            document.save()

            # Update signers with ZapSign data if available
            zapsign_signers = zapsign_response.get("signers", [])
            for i, signer in enumerate(signers):
                if i < len(zapsign_signers):
                    zapsign_signer = zapsign_signers[i]
                    signer.token = zapsign_signer.get("token", "")
                    signer.external_id = zapsign_signer.get("external_id", "")
                    signer.save()

            logger.info(
                f"Document created successfully: {document.name} (ID: {document.id})"
            )
            return document

        except Company.DoesNotExist:
            logger.error(f"Company with ID {company_id} does not exist")
            raise ValueError(f"Company with ID {company_id} does not exist")
        except ZapSignAPIException as e:
            logger.error(f"ZapSign API error: {str(e)}")
            # Update document status to indicate API failure
            document.status = "API_ERROR"
            document.save()
            raise
        except Exception as e:
            logger.error(f"Unexpected error creating document: {str(e)}")
            raise

    def get_document_with_signers(self, document_id: int) -> Document:
        """
        Get document with related signers

        Args:
            document_id: ID of the document

        Returns:
            Document instance with prefetched signers
        """
        try:
            return (
                Document.objects.select_related("company")
                .prefetch_related("signers")
                .get(id=document_id)
            )
        except Document.DoesNotExist:
            logger.error(f"Document with ID {document_id} does not exist")
            raise ValueError(f"Document with ID {document_id} does not exist")

    def list_documents(self, company_id: int = None) -> List[Document]:
        """
        List all documents, optionally filtered by company

        Args:
            company_id: Optional company ID to filter by

        Returns:
            List of Document instances
        """
        queryset = Document.objects.select_related("company").prefetch_related(
            "signers"
        )

        if company_id:
            queryset = queryset.filter(company_id=company_id)

        return list(queryset.order_by("-created_at"))

    def update_document_status(self, document_id: int) -> Document:
        """
        Update document status by fetching from ZapSign API

        Args:
            document_id: ID of the document

        Returns:
            Updated Document instance
        """
        document = self.get_document_with_signers(document_id)

        if not document.token:
            logger.warning(f"Document {document_id} has no ZapSign token")
            return document

        # Fetch status from ZapSign API
        status_data = self.zapsign_service.get_document_status(
            document.company, document.token
        )

        if status_data:
            # Update document status
            old_status = document.status
            document.status = status_data.get("status", document.status)

            if old_status != document.status:
                document.save()
                logger.info(
                    f"Document {document_id} status updated: {old_status} -> {document.status}"
                )

        return document
