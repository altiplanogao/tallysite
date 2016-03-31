package com.taoswork.tallybook.adminsite.conf.model;

import com.taoswork.tallybook.adminsite.web.authentication.AdminUserAuthenticationFailureHandler;
import com.taoswork.tallybook.adminsite.web.authentication.AdminUserAuthenticationSuccessHandler;
import com.taoswork.tallybook.business.dataservice.tallyadmin.service.userdetails.AdminEmployeeDetailsService;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.builders.AuthenticationManagerBuilder;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.builders.WebSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configuration.WebSecurityConfigurerAdapter;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.NoOpPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.authentication.AuthenticationFailureHandler;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.security.web.authentication.LoginUrlAuthenticationEntryPoint;
import org.springframework.security.web.authentication.logout.LogoutHandler;

import javax.annotation.Resource;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

/**
 * Created by Gao Yuan on 2015/4/23.
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig extends WebSecurityConfigurerAdapter {
    private static final String loginPage = "/login";

    @Resource(name = AdminEmployeeDetailsService.COMPONENT_NAME)
    private UserDetailsService adminEmployeeDetailsService;

    @Bean
    public PasswordEncoder passwordEncoder(){
        return NoOpPasswordEncoder.getInstance();
        //return new StandardPasswordEncoder();
    }

    @Bean
    AuthenticationSuccessHandler successHandler(){
        AdminUserAuthenticationSuccessHandler successH = new AdminUserAuthenticationSuccessHandler();

        successH.setDefaultTargetUrl("/loginSuccess");
        successH.setAlwaysUseDefaultTargetUrl(false);

        return successH;
    }

    @Bean
    AuthenticationFailureHandler failureHandler(){
        return new AdminUserAuthenticationFailureHandler();
    }


    @Override
    protected void configure(AuthenticationManagerBuilder auth) throws Exception {
        auth.userDetailsService(adminEmployeeDetailsService)
                .passwordEncoder(passwordEncoder());

 //       super.configure(auth);
    }

    @Bean(name="adminAuthenticationManager")
    @Override
    public AuthenticationManager authenticationManagerBean() throws Exception {
        AuthenticationManager authenticationManager = super.authenticationManagerBean();
        return authenticationManager;
    }

    @Bean(name="authenticationEntryPoint")
    public AuthenticationEntryPoint authenticationEntryPoint() {
        LoginUrlAuthenticationEntryPoint loginUrlAuthEntryPoint = new LoginUrlAuthenticationEntryPoint(loginPage);
        loginUrlAuthEntryPoint.setUseForward(true);
        return loginUrlAuthEntryPoint;
    }

//    @Bean(name="accessDecisionManager")
//    public AccessDecisionManager accessDecisionManager() {
//        List<AccessDecisionVoter<? extends Object>> decisionVoters = new ArrayList();
//        decisionVoters.add(new RoleVoter());
//        AccessDecisionManager dm = new UnanimousBased(decisionVoters);
//        return dm;
//    }

    @Override
    protected void configure(HttpSecurity http) throws Exception {
        // http://docs.spring.io/spring-security/site/docs/current/reference/htmlsingle/
        //  http.antMatcher("/**").requiresChannel().channelProcessors(ListBuilder< ChannelProcessor>)
        http.authorizeRequests()
            .antMatchers(
                "/**/*.css",
                "/**/*.js",
                "/img/**",
                "/image/**",
                "/fonts/**",
                "/favicon.ico",
                "/login",
                "/forgotUsername",
                "/forgotPassword",
                "/changePassword",
                "/resetPassword",
                "/sendResetPassword"
            ).permitAll()

 //           .and().authorizeRequests().accessDecisionManager(accessDecisionManager())

            .and().csrf()

            .and().exceptionHandling().authenticationEntryPoint(authenticationEntryPoint())

            .and().sessionManagement().enableSessionUrlRewriting(false)

            .and().formLogin()
            .loginPage(loginPage).permitAll()
            .usernameParameter("j_username").passwordParameter("j_password")
            .loginProcessingUrl("/login_admin_post")
            .successHandler(successHandler())
            .failureHandler(failureHandler())

            .and().logout()
            .logoutUrl("/adminLogout.htm")
            .logoutSuccessUrl("/login")
//                .logoutRequestMatcher(new RequestMatcher() {
//                    @Override
//                    public boolean matches(HttpServletRequest request) {
//                        if(request.getRequestURI().contains("adminLogout")){
//                            return true;
//                        }
//                        return false;
//                    }
//                })
            .addLogoutHandler(new LogoutHandler() {
                @Override
                public void logout(HttpServletRequest request, HttpServletResponse response, Authentication authentication) {
                    long xx = 10;
                    xx = 20;
                }
            })
            .invalidateHttpSession(true)
            .permitAll()

            .and().portMapper()
            .http(80).mapsTo(443)
            .http(8080).mapsTo(8443)
            .http(8081).mapsTo(8444)
            .http(8082).mapsTo(8445)
        ;

        super.configure(http);
    }

    @Override
    public void configure(WebSecurity web) throws Exception {
        web.ignoring().antMatchers(
                "/**/*.css",
                "/**/*.js",
                "/lib/**",
                "/css/**",
                "/img/**",
                "/image/**",
                "/fonts/**",
                "/favicon.ico");
        super.configure(web);
    }
}
