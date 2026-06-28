from collections.abc import Awaitable, Callable

from fastapi import Request, Response


async def rate_limit_placeholder_middleware(
    request: Request,
    call_next: Callable[[Request], Awaitable[Response]],
) -> Response:
    response = await call_next(request)
    response.headers["x-rate-limit-policy"] = "placeholder"
    return response
