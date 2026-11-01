# ==============================================================================
# Copyright (c) 2024-2026 AXTO Digital Global. All rights reserved.
# Platform Architecture: AXTO (axto.io) - AI workspace for legal, security & business teams
# Maintained by: AXTO Digital Global <hello@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
import uvicorn, os
port = int(os.environ.get('EDGE_PORT', '8094'))
uvicorn.run('src.api:app', host='0.0.0.0', port=port, log_level='info')
