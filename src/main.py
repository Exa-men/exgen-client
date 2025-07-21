from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional
import datetime
from sqlalchemy.orm import Session
from src.database import SessionLocal
from src.models import WorkflowGroup
from src.dependencies import get_authenticated_user
from src.app import app
from uuid import UUID

class WorkflowGroupOut(BaseModel):
    id: UUID
    name: str
    is_active: bool
    created_at: datetime.datetime
    updated_at: datetime.datetime
    # Optionally include config and prompts if needed

class WorkflowGroupCreate(BaseModel):
    name: Optional[str] = None

class WorkflowGroupRename(BaseModel):
    name: str

class WorkflowGroupConfigUpdate(BaseModel):
    config: dict
    prompts: Optional[dict] = None
    base_instructions: Optional[str] = None

@app.get("/api/v1/workflow/groups", response_model=List[WorkflowGroupOut], tags=["Workflow Groups"])
async def list_workflow_groups(auth: dict = Depends(get_authenticated_user)):
    """List all workflow groups for the authenticated user."""
    db: Session = SessionLocal()
    groups = db.query(WorkflowGroup).filter_by(user_id=auth["sub"]).all()
    db.close()
    return [WorkflowGroupOut(
        id=g.id, name=g.name, is_active=getattr(g, 'is_active', False), created_at=g.created_at, updated_at=g.updated_at
    ) for g in groups]

@app.post("/api/v1/workflow/groups", response_model=WorkflowGroupOut, status_code=status.HTTP_201_CREATED, tags=["Workflow Groups"])
async def create_workflow_group(data: WorkflowGroupCreate, auth: dict = Depends(get_authenticated_user)):
    """Create a new workflow group for the authenticated user."""
    db: Session = SessionLocal()
    group = WorkflowGroup(
        user_id=auth["sub"],
        name=data.name or "Nieuwe workflow",
        created_at=datetime.datetime.utcnow(),
        updated_at=datetime.datetime.utcnow(),
        is_active=False
    )
    db.add(group)
    db.commit()
    db.refresh(group)
    db.close()
    return WorkflowGroupOut(
        id=group.id, name=group.name, is_active=getattr(group, 'is_active', False), created_at=group.created_at, updated_at=group.updated_at
    )

@app.patch("/api/v1/workflow/groups/{group_id}", response_model=WorkflowGroupOut, tags=["Workflow Groups"])
async def rename_workflow_group(group_id: UUID, data: WorkflowGroupRename, auth: dict = Depends(get_authenticated_user)):
    """Rename a workflow group."""
    db: Session = SessionLocal()
    group = db.query(WorkflowGroup).filter_by(id=group_id, user_id=auth["sub"]).first()
    if not group:
        db.close()
        raise HTTPException(status_code=404, detail="Workflow group not found")
    group.name = data.name
    group.updated_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(group)
    db.close()
    return WorkflowGroupOut(
        id=group.id, name=group.name, is_active=getattr(group, 'is_active', False), created_at=group.created_at, updated_at=group.updated_at
    )

@app.delete("/api/v1/workflow/groups/{group_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Workflow Groups"])
async def delete_workflow_group(group_id: UUID, auth: dict = Depends(get_authenticated_user)):
    """Delete a workflow group and all associated configs and prompts."""
    db: Session = SessionLocal()
    group = db.query(WorkflowGroup).filter_by(id=group_id, user_id=auth["sub"]).first()
    if not group:
        db.close()
        raise HTTPException(status_code=404, detail="Workflow group not found")
    db.delete(group)
    db.commit()
    db.close()
    return JSONResponse(status_code=status.HTTP_204_NO_CONTENT, content={})

@app.post("/api/v1/workflow/groups/{group_id}/activate", response_model=WorkflowGroupOut, tags=["Workflow Groups"])
async def activate_workflow_group(group_id: UUID, auth: dict = Depends(get_authenticated_user)):
    """Set a workflow group as active (and unset others)."""
    db: Session = SessionLocal()
    groups = db.query(WorkflowGroup).filter_by(user_id=auth["sub"]).all()
    found = False
    for g in groups:
        if g.id == group_id:
            g.is_active = True
            found = True
        else:
            g.is_active = False
        g.updated_at = datetime.datetime.utcnow()
    if not found:
        db.close()
        raise HTTPException(status_code=404, detail="Workflow group not found")
    db.commit()
    group = db.query(WorkflowGroup).filter_by(id=group_id).first()
    db.close()
    return WorkflowGroupOut(
        id=group.id, name=group.name, is_active=getattr(group, 'is_active', False), created_at=group.created_at, updated_at=group.updated_at
    )

@app.patch("/api/v1/workflow/groups/{group_id}/config", tags=["Workflow Groups"])
async def update_workflow_group_config(group_id: UUID, data: WorkflowGroupConfigUpdate, auth: dict = Depends(get_authenticated_user)):
    """Update workflow group configuration and prompts."""
    db: Session = SessionLocal()
    group = db.query(WorkflowGroup).filter_by(id=group_id, user_id=auth["sub"]).first()
    if not group:
        db.close()
        raise HTTPException(status_code=404, detail="Workflow group not found")
    # Update config (steps, etc.)
    if data.config:
        # Assume one config per group for now
        if group.workflow_configs:
            config_obj = group.workflow_configs[0]
            config_obj.config = data.config
            config_obj.updated_at = datetime.datetime.utcnow()
        else:
            from src.models import WorkflowConfig as WorkflowConfigDB
            config_obj = WorkflowConfigDB(
                user_id=auth["sub"],
                workflow_group_id=group.id,
                config=data.config,
                created_at=datetime.datetime.utcnow(),
                updated_at=datetime.datetime.utcnow()
            )
            db.add(config_obj)
    # Update prompts
    if data.prompts:
        for name, content in data.prompts.items():
            prompt = next((p for p in group.prompts if p.name == name), None)
            if prompt:
                prompt.content = content
                prompt.updated_at = datetime.datetime.utcnow()
            else:
                from src.models import Prompt
                prompt = Prompt(
                    user_id=auth["sub"],
                    workflow_group_id=group.id,
                    name=name,
                    content=content,
                    created_at=datetime.datetime.utcnow(),
                    updated_at=datetime.datetime.utcnow()
                )
                db.add(prompt)
    # Update base instructions (as a special prompt)
    if data.base_instructions is not None:
        base_prompt = next((p for p in group.prompts if p.name == "_base_instructions"), None)
        if base_prompt:
            base_prompt.content = data.base_instructions
            base_prompt.updated_at = datetime.datetime.utcnow()
        else:
            from src.models import Prompt
            base_prompt = Prompt(
                user_id=auth["sub"],
                workflow_group_id=group.id,
                name="_base_instructions",
                content=data.base_instructions,
                created_at=datetime.datetime.utcnow(),
                updated_at=datetime.datetime.utcnow()
            )
            db.add(base_prompt)
    db.commit()
    db.close()
    return {"status": "ok"} 