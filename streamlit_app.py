import streamlit as st
import requests
import os
from dotenv import load_dotenv
import json
import time
import websocket
import threading

load_dotenv()

# Configuration
API_BASE_URL = os.getenv("API_BASE_URL", "https://exgen-api-5ox6m4ijja-ez.a.run.app")
API_KEY = os.getenv("API_KEY")

# Helper function for API calls
def make_api_request(endpoint, method="GET", data=None, files=None):
    headers = {
        "Authorization": f"Bearer {API_KEY}",
    }
    
    # Don't set Content-Type for multipart/form-data (requests will set it automatically)
    if files is None:
        headers["Content-Type"] = "application/json"

    url = f"{API_BASE_URL}{endpoint}"

    try:
        if method == "GET":
            response = requests.get(url, headers=headers)
        elif method == "POST":
            if files:
                response = requests.post(url, headers=headers, data=data, files=files)
            else:
                response = requests.post(url, headers=headers, json=data)
        elif method == "PUT":
            response = requests.put(url, headers=headers, json=data)
        elif method == "DELETE":
            response = requests.delete(url, headers=headers)

        if response.status_code == 401:
            st.error("Authentication failed. Check your API key.")
            return None
        elif response.status_code >= 400:
            st.error(f"API Error: {response.status_code} - {response.text}")
            return None

        return response.json()

    except requests.exceptions.RequestException as e:
        st.error(f"Connection error: {str(e)}")
        return None

# Streamlit UI
st.set_page_config(page_title="ExGen Document Generator", layout="wide")
st.title("📄 ExGen Document Generator")

# Sidebar for navigation
st.sidebar.title("Navigation")
page = st.sidebar.selectbox("Choose a page", ["Document Generation", "Job Status", "Settings"])

if page == "Document Generation":
    st.header("Generate Documents")
    
    # File upload
    uploaded_file = st.file_uploader(
        "Choose a PDF or XML file", 
        type=['pdf', 'xml'],
        help="Upload a PDF or XML file to process"
    )
    
    # Template selection
    template_name = st.text_input(
        "Template Name or ID",
        placeholder="Enter template name or ID",
        help="Specify which template to use for document generation"
    )
    
    # Generate button
    if st.button("Generate Document", type="primary", disabled=not uploaded_file or not template_name):
        if uploaded_file and template_name:
            with st.spinner("Uploading file and starting generation..."):
                # Prepare the file for upload
                files = {"file": (uploaded_file.name, uploaded_file.getvalue(), uploaded_file.type)}
                data = {"template_name_or_id": template_name}
                
                result = make_api_request("/api/v1/generate", method="POST", data=data, files=files)
                
                if result:
                    st.success("Document generation started successfully!")
                    st.json(result)
                    
                    # Store job ID in session state for status checking
                    st.session_state.current_job_id = result.get("job_id")
                    st.session_state.job_status = "queued"

elif page == "Job Status":
    st.header("Job Status")
    
    # Job ID input
    job_id = st.text_input(
        "Job ID",
        value=st.session_state.get("current_job_id", ""),
        placeholder="Enter job ID to check status"
    )
    
    if job_id:
        col1, col2 = st.columns([1, 3])
        
        with col1:
            if st.button("Check Status", type="primary"):
                with st.spinner("Checking job status..."):
                    result = make_api_request(f"/api/v1/jobs/{job_id}")
                    if result:
                        st.session_state.job_status = result.get("status")
                        st.session_state.job_data = result
                        st.success("Status updated!")
        
        with col2:
            if st.button("Refresh Status", disabled=not st.session_state.get("job_data")):
                with st.spinner("Refreshing..."):
                    result = make_api_request(f"/api/v1/jobs/{job_id}")
                    if result:
                        st.session_state.job_status = result.get("status")
                        st.session_state.job_data = result
        
        # Display job status
        if st.session_state.get("job_data"):
            job_data = st.session_state.job_data
            
            # Status indicator
            status_color = {
                "queued": "🟡",
                "running": "", 
                "completed": "🟢",
                "failed": ""
            }.get(job_data.get("status"), "⚪")
            
            st.subheader(f"{status_color} Job Status: {job_data.get('status', 'Unknown').title()}")
            
            # Progress bar
            progress = job_data.get("progress", 0)
            st.progress(progress / 100)
            st.caption(f"Progress: {progress}%")
            
            # Current step
            current_step = job_data.get("current_step", "Unknown")
            st.info(f"Current Step: {current_step}")
            
            # Logs
            logs = job_data.get("logs", [])
            if logs:
                st.subheader("Recent Logs")
                log_container = st.container()
                with log_container:
                    for log in logs[-10:]:  # Show last 10 logs
                        st.text(log)
            
            # Result
            result = job_data.get("result")
            if result:
                st.subheader("Result")
                st.json(result)

elif page == "Settings":
    st.header("Settings")
    
    # API Configuration
    st.subheader("API Configuration")
    st.info(f"API Base URL: {API_BASE_URL}")
    st.info("API Key: " + ("✅ Configured" if API_KEY else "❌ Missing"))
    
    # Health check
    if st.button("Test API Connection"):
        with st.spinner("Testing connection..."):
            result = make_api_request("/api/v1/health")
            if result:
                st.success("✅ API connection successful!")
                st.json(result)
            else:
                st.error("❌ API connection failed!")

# Footer
st.sidebar.markdown("---")
st.sidebar.markdown("Built with Streamlit + FastAPI")
