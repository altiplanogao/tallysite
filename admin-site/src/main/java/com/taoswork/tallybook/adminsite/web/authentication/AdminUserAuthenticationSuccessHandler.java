package com.taoswork.tallybook.adminsite.web.authentication;

import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.security.web.savedrequest.HttpSessionRequestCache;
import org.springframework.security.web.savedrequest.RequestCache;
import org.springframework.security.web.savedrequest.SavedRequest;
import org.springframework.util.StringUtils;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;

/**
 * Created by Gao Yuan on 2015/4/23.
 */
public class AdminUserAuthenticationSuccessHandler
    extends SimpleUrlAuthenticationSuccessHandler {
        private static final String successUrlParameter = "successUrl=";

        private RequestCache requestCache = new HttpSessionRequestCache();

        public AdminUserAuthenticationSuccessHandler() {
        }

        @Override
        public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response, Authentication authentication) throws IOException, ServletException {
//                super.onAuthenticationSuccess(request, response, authentication);
                SavedRequest savedRequest = requestCache.getRequest(request, response);
                if (savedRequest == null) {
                        super.onAuthenticationSuccess(request, response, authentication);
                        return;
                }

                String targetUrlParameter = getTargetUrlParameter();
                if (isAlwaysUseDefaultTargetUrl() || (targetUrlParameter != null && StringUtils.hasText(request.getParameter(targetUrlParameter)))) {
                        requestCache.removeRequest(request, response);
                        super.onAuthenticationSuccess(request, response, authentication);
                        return;
                }
                clearAuthenticationAttributes(request);

                String targetUrl = savedRequest.getRedirectUrl();
                targetUrl = targetUrl.replace("sessionTimeout=true", "");
                if (targetUrl.charAt(targetUrl.length() - 1) == '?') {
                        targetUrl = targetUrl.substring(0, targetUrl.length() - 1);
                }

                if (targetUrl.contains(successUrlParameter)) {
                        int successUrlPosistion = targetUrl.indexOf(successUrlParameter) + successUrlParameter.length();
                        int nextParamPosistion = targetUrl.indexOf("&", successUrlPosistion);
                        if (nextParamPosistion == -1) {
                                targetUrl = targetUrl.substring(successUrlPosistion, targetUrl.length());
                        } else {
                                targetUrl = targetUrl.substring(successUrlPosistion, nextParamPosistion);
                        }
                }

                logger.debug("Redirecting to DefaultSavedRequest Url: " + targetUrl);
                getRedirectStrategy().sendRedirect(request, response, targetUrl);

        }
}
