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
        Create a document with signers, integrating with ZapSign API

        Args:
            company_id: ID of the company
            document_data: Document data (name, pdf_url)
            signers_data: List of signer data (name, email)
            created_by: User who created the document

        Returns:
            Created Document instance with ZapSign data

        Raises:
            ValueError: If company doesn't exist or validation fails
            ZapSignAPIException: If ZapSign API call fails
        """
        try:
            # Get company and validate
            try:
                company = Company.objects.get(id=company_id)
            except Company.DoesNotExist:
                raise ValueError(f"Company with ID {company_id} does not exist")

            # Create document in local DB first (without ZapSign data)
            document = Document.objects.create(
                name=document_data["name"],
                company=company,
                created_by=created_by,
                status="PENDING_API",  # Pending ZapSign API call
            )

            # Create signers in local DB
            signer_objects = []
            for signer_data in signers_data:
                signer = Signer.objects.create(
                    name=signer_data["name"],
                    email=signer_data["email"],
                    document=document,
                    status="PENDING",
                )
                signer_objects.append(signer)

            # Prepare data for ZapSign API
            zapsign_data = {
                "name": document_data["name"],
                "pdf_url": document_data["pdf_url"],
                "signers": signers_data,
            }

            # Call ZapSign API
            logger.info(f"Creating document in ZapSign: {document.name}")
            zapsign_response = self.zapsign_service.create_document(
                company, zapsign_data
            )

            # Update document with ZapSign response data
            document.token = zapsign_response.get("token")
            document.open_id = zapsign_response.get("open_id")
            document.external_id = zapsign_response.get("external_id", "")
            document.status = "PENDING"  # Document created in ZapSign
            document.save()

            # Update signers with ZapSign data if available
            zapsign_signers = zapsign_response.get("signers", [])
            for i, signer_obj in enumerate(signer_objects):
                if i < len(zapsign_signers):
                    zapsign_signer = zapsign_signers[i]
                    signer_obj.token = zapsign_signer.get("token", "")
                    signer_obj.external_id = zapsign_signer.get("external_id", "")
                    signer_obj.save()

            logger.info(
                f"Document created successfully: {document.name} (ID: {document.id})"
            )
            return document

        except Company.DoesNotExist:
            logger.error(f"Company with ID {company_id} does not exist")
            raise ValueError(f"Company with ID {company_id} does not exist")
        except ZapSignAPIException:
            # Re-raise ZapSign API exceptions
            logger.error("ZapSign API error occurred during document creation")
            raise
        except Exception as e:
            logger.error(f"Unexpected error creating document: {str(e)}")
            raise

    def update_document_status(self, document_id: int) -> Document:
        """
        Update document status by fetching from ZapSign API

        Args:
            document_id: ID of the document

        Returns:
            Updated Document instance

        Raises:
            ValueError: If document doesn't exist
        """
        try:
            document = Document.objects.get(id=document_id)
        except Document.DoesNotExist:
            raise ValueError(f"Document with ID {document_id} does not exist")

        try:
            # Get status from ZapSign API
            if document.token:
                status_data = self.zapsign_service.get_document_status(
                    document.company, document.token
                )

                if status_data:
                    # Update document status
                    document.status = status_data.get("status", document.status)
                    document.save()
                    logger.info(
                        f"Updated document {document_id} status to {document.status}"
                    )

            return document

        except Exception as e:
            logger.error(f"Error updating document status: {str(e)}")
            raise
