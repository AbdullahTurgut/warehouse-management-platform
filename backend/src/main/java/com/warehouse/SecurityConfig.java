package com.warehouse;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;

@Configuration
public class SecurityConfig {
    @Bean UserDetailsService users(@Value("${app.admin-password}") String admin, @Value("${app.operator-password}") String operator) {
        var encoder=new BCryptPasswordEncoder();
        return new InMemoryUserDetailsManager(
            User.withUsername("admin").password(encoder.encode(admin)).roles("ADMIN").build(),
            User.withUsername("operator").password(encoder.encode(operator)).roles("OPERATOR").build());
    }
    @Bean BCryptPasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(); }
    @Bean SecurityFilterChain security(HttpSecurity http) throws Exception {
        // Retain Basic login and store its authenticated context in an HttpOnly session cookie.
        // Spring Security 6 DelegatingSecurityContextRepository already reads from HttpSession by
        // default, so the session cookie alone restores login on page reload.
        return http.csrf(csrf -> csrf.csrfTokenRequestHandler(new CsrfTokenRequestAttributeHandler()))
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/error").permitAll()
                .requestMatchers(HttpMethod.GET,"/api/v1/auth/csrf").permitAll()
                .requestMatchers(HttpMethod.POST,"/api/v1/products","/api/v1/locations","/api/v1/warehouses").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PUT,"/api/v1/products/**").hasRole("ADMIN")
                .anyRequest().authenticated())
            .httpBasic(basic -> basic.securityContextRepository(new HttpSessionSecurityContextRepository()).authenticationEntryPoint((request,response,error) -> {
                response.setStatus(401); response.setContentType("application/json"); response.getWriter().write("{\"message\":\"Sign in with a valid username and password\"}");
            }))
            .logout(logout -> logout.logoutUrl("/api/v1/auth/logout").deleteCookies("JSESSIONID")
                .logoutSuccessHandler((request,response,authentication) -> response.setStatus(204)))
            .exceptionHandling(errors -> errors.accessDeniedHandler((request,response,error) -> {
                response.setStatus(403); response.setContentType("application/json"); response.getWriter().write("{\"message\":\"An Admin account is required for this action\"}");
            })).build();
    }
}
